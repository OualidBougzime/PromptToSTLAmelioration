# python/cadquery-server/server.py - VERSION WINDOWS COMPATIBLE
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cadquery as cq
import traceback
import tempfile
import os
import threading
from io import BytesIO

app = Flask(__name__)
CORS(app)

# ============================================
# TIMEOUT HANDLER (WINDOWS COMPATIBLE)
# ============================================
class TimeoutException(Exception):
    pass

def run_with_timeout(func, args=(), kwargs={}, timeout=120):
    """Execute function with timeout - Windows compatible"""
    result = [TimeoutException("Execution timed out")]
    
    def worker():
        try:
            result[0] = func(*args, **kwargs)
        except Exception as e:
            result[0] = e
    
    thread = threading.Thread(target=worker)
    thread.daemon = True
    thread.start()
    thread.join(timeout)
    
    if thread.is_alive():
        # Thread still running = timeout
        raise TimeoutException(f"Execution timed out after {timeout}s")
    
    if isinstance(result[0], Exception):
        raise result[0]
    
    return result[0]

# ============================================
# HEALTH CHECK
# ============================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'cadquery_version': cq.__version__,
        'platform': 'windows'
    })

# ============================================
# VALIDATION SYNTAXE
# ============================================
@app.route('/validate', methods=['POST'])
def validate():
    try:
        code = request.json.get('code', '')
        code_clean = code.replace('import cadquery as cq', '')
        compile(code_clean, '<string>', 'exec')
        return jsonify({'syntax': True, 'warnings': [], 'errors': []})
    except SyntaxError as e:
        return jsonify({'syntax': False, 'warnings': [], 'errors': [str(e)]})

# ============================================
# CATÉGORISATION ERREURS
# ============================================
def categorize_cadquery_error(error_msg: str) -> str:
    """Catégorise les erreurs CadQuery pour feedback ciblé"""
    error_msg_lower = error_msg.lower()
    
    if 'brep' in error_msg_lower or 'command not done' in error_msg_lower:
        return 'geometric_invalid'
    elif 'no pending wires' in error_msg_lower or 'wire' in error_msg_lower:
        return 'unclosed_wire'
    elif 'fillet' in error_msg_lower:
        return 'fillet_error'
    elif 'boolean' in error_msg_lower or 'union' in error_msg_lower or 'cut' in error_msg_lower:
        return 'boolean_operation'
    elif 'memory' in error_msg_lower:
        return 'out_of_memory'
    elif 'timeout' in error_msg_lower:
        return 'timeout'
    else:
        return 'general'

def get_error_suggestion(error_type: str) -> str:
    """Suggestions spécifiques selon le type d'erreur"""
    suggestions = {
        'geometric_invalid': 'Opération géométrique invalide. Vérifier: (1) Rayon fillet < épaisseur mur, (2) Dimensions positives en float, (3) Overlap correct pour booléens',
        'unclosed_wire': 'Wire non fermé. Ajouter .close() après opérations 2D (lineTo, arc, etc.)',
        'fillet_error': 'Échec fillet. S\'assurer que rayon < longueur arêtes adjacentes.',
        'boolean_operation': 'Opération booléenne échouée. Essayer avec tolérance: .union(obj, tol=0.0001) ou .fuse()',
        'out_of_memory': 'Mémoire insuffisante. Simplifier: moins de features, cellules plus grandes pour lattice.',
        'timeout': 'Timeout: Simplifier géométrie, augmenter taille cellules lattice, réduire nombre features.',
        'general': 'Vérifier syntaxe, paramètres en float, et usage API CadQuery.'
    }
    return suggestions.get(error_type, suggestions['general'])

def validate_safe_code(code: str) -> bool:
    """Validation basique contre code malicieux"""
    dangerous = ['subprocess', 'os.system', 'eval(', '__import__', 'open(']
    return not any(danger in code for danger in dangerous)

# ============================================
# EXÉCUTION CODE CADQUERY
# ============================================
def execute_cadquery_code(code_clean, exec_globals):
    """Function to execute CadQuery code (for timeout wrapper)"""
    exec(code_clean, exec_globals)
    return exec_globals.get('result_obj')

@app.route('/execute', methods=['POST'])
def execute():
    try:
        code = request.json.get('code', '')
        timeout = request.json.get('timeout', 120)  # 2 min par défaut
        
        print(f"\n=== Executing CadQuery code (timeout: {timeout}s) ===\n{code[:200]}...\n")
        
        # Validation sécurité
        if not validate_safe_code(code):
            return jsonify({'error': 'Code validation failed: unsafe imports'}), 400
        
        code_clean = code.replace('import cadquery as cq', '').strip()
        
        # Container pour le résultat
        exec_globals = {
            'cq': cq,
            'math': __import__('math'),
            'result_obj': None
        }
        
        def show_object(obj):
            exec_globals['result_obj'] = obj
        
        exec_globals['show_object'] = show_object
        
        # Exécution avec timeout (Windows compatible)
        try:
            run_with_timeout(
                execute_cadquery_code,
                args=(code_clean, exec_globals),
                timeout=timeout
            )
        except TimeoutException as e:
            return jsonify({
                'error': str(e),
                'error_type': 'timeout',
                'suggestion': get_error_suggestion('timeout')
            }), 500
        
        result_obj = exec_globals.get('result_obj')
        
        if result_obj is None:
            return jsonify({'error': 'No result - show_object() not called'}), 400
        
        print("Converting to mesh...")
        vertices, faces, normals = convert_to_mesh(result_obj)
        print(f"✅ Mesh: {len(vertices)//3} vertices, {len(faces)//3} triangles")

        return jsonify({
            'vertices': vertices,
            'faces': faces,
            'normals': normals
        })
        
    except Exception as e:
        error_msg = str(e)
        error_type = categorize_cadquery_error(error_msg)
        
        print(f"❌ ERROR: {error_msg}")
        print(traceback.format_exc())
        
        return jsonify({
            'error': error_msg,
            'error_type': error_type,
            'suggestion': get_error_suggestion(error_type),
            'traceback': traceback.format_exc()
        }), 500

# ============================================
# EXPORT STL (CORRIGÉ)
# ============================================
@app.route('/export', methods=['POST'])
def export_stl():
    try:
        code = request.json.get('code', '')
        print(f"\n=== Exporting to STL ===")
        
        code_clean = code.replace('import cadquery as cq', '').strip()
        
        result_obj = None
        def show_object(obj):
            nonlocal result_obj
            result_obj = obj
        
        exec_globals = {'cq': cq, 'show_object': show_object, 'math': __import__('math')}
        
        try:
            exec(code_clean, exec_globals)
        except Exception as exec_error:
            print(f"❌ Execution error: {str(exec_error)}")
            return jsonify({'error': f'Code execution failed: {str(exec_error)}'}), 400
        
        if result_obj is None:
            print("❌ No result generated")
            return jsonify({'error': 'No result - show_object() not called'}), 400
        
        if not hasattr(result_obj, 'val'):
            print("❌ Invalid result object")
            return jsonify({'error': 'Invalid result object'}), 400
        
        # Créer fichier temporaire
        with tempfile.NamedTemporaryFile(suffix='.stl', delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        print(f"📝 Exporting to temp file: {tmp_path}")
        
        try:
            # Export vers fichier temporaire
            cq.exporters.export(result_obj, tmp_path, exportType='STL')
            
            # Lire le contenu
            with open(tmp_path, 'rb') as f:
                stl_bytes = f.read()
            
            # Nettoyer fichier temporaire
            os.unlink(tmp_path)
            
            print(f"✅ STL generated: {len(stl_bytes)} bytes")
            
            # Retourner avec headers corrects
            return Response(
                stl_bytes,
                mimetype='application/octet-stream',
                headers={
                    'Content-Disposition': 'attachment; filename="model.stl"',
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': str(len(stl_bytes))
                }
            )
            
        except Exception as export_error:
            # Nettoyer en cas d'erreur
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            print(f"❌ Export error: {str(export_error)}")
            return jsonify({'error': f'STL export failed: {str(export_error)}'}), 500
        
    except Exception as e:
        print(f"❌ GLOBAL ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# ============================================
# CONVERSION MESH
# ============================================
def convert_to_mesh(shape):
    """Convertit objet CadQuery en mesh Three.js avec normales"""
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_FACE
    from OCP.TopExp import TopExp_Explorer
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS
    import math
    
    vertices = []
    faces = []
    normals = []
    
    ocp_shape = shape.val().wrapped
    
    # Maillage
    BRepMesh_IncrementalMesh(ocp_shape, 0.1, False, 0.5, True)
    
    vertex_offset = 0
    face_explorer = TopExp_Explorer(ocp_shape, TopAbs_FACE)
    
    while face_explorer.More():
        face = TopoDS.Face_s(face_explorer.Current())
        location = TopLoc_Location()
        triangulation = BRep_Tool.Triangulation_s(face, location)
        
        if triangulation:
            trsf = location.Transformation()
            
            # Extraire sommets
            face_vertices = []
            for i in range(1, triangulation.NbNodes() + 1):
                node = triangulation.Node(i)
                if not location.IsIdentity():
                    node.Transform(trsf)
                vertices.extend([node.X(), node.Y(), node.Z()])
                face_vertices.append((node.X(), node.Y(), node.Z()))
            
            # Extraire triangles
            face_orientation = face.Orientation()
            
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                n1, n2, n3 = triangle.Get()
                
                idx1 = n1 - 1 + vertex_offset
                idx2 = n2 - 1 + vertex_offset
                idx3 = n3 - 1 + vertex_offset
                
                if face_orientation == 1:
                    faces.extend([idx1, idx3, idx2])
                else:
                    faces.extend([idx1, idx2, idx3])
            
            # Calculer normales
            vertex_normals = {}
            
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                n1, n2, n3 = triangle.Get()
                
                v1 = face_vertices[n1 - 1]
                v2 = face_vertices[n2 - 1]
                v3 = face_vertices[n3 - 1]
                
                edge1 = (v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2])
                edge2 = (v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2])
                
                nx = edge1[1] * edge2[2] - edge1[2] * edge2[1]
                ny = edge1[2] * edge2[0] - edge1[0] * edge2[2]
                nz = edge1[0] * edge2[1] - edge1[1] * edge2[0]
                
                length = math.sqrt(nx*nx + ny*ny + nz*nz)
                if length > 0:
                    nx /= length
                    ny /= length
                    nz /= length
                
                if face_orientation == 1:
                    nx, ny, nz = -nx, -ny, -nz
                
                for idx in [n1 - 1, n2 - 1, n3 - 1]:
                    if idx not in vertex_normals:
                        vertex_normals[idx] = [0.0, 0.0, 0.0]
                    vertex_normals[idx][0] += nx
                    vertex_normals[idx][1] += ny
                    vertex_normals[idx][2] += nz
            
            for i in range(triangulation.NbNodes()):
                if i in vertex_normals:
                    nx, ny, nz = vertex_normals[i]
                    length = math.sqrt(nx*nx + ny*ny + nz*nz)
                    if length > 0:
                        normals.extend([nx/length, ny/length, nz/length])
                    else:
                        normals.extend([0.0, 0.0, 1.0])
                else:
                    normals.extend([0.0, 0.0, 1.0])
            
            vertex_offset += triangulation.NbNodes()
        
        face_explorer.Next()
    
    return vertices, faces, normals

if __name__ == '__main__':
    print("🚀 Starting CadQuery server on port 8788 (Windows compatible)...")
    app.run(host='0.0.0.0', port=8788, debug=True)