# python/cadquery-server/server.py
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cadquery as cq
import traceback
from io import BytesIO

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'cadquery_version': cq.__version__
    })

@app.route('/validate', methods=['POST'])
def validate():
    try:
        code = request.json.get('code', '')
        code_clean = code.replace('import cadquery as cq', '')
        compile(code_clean, '<string>', 'exec')
        return jsonify({'syntax': True, 'warnings': [], 'errors': []})
    except SyntaxError as e:
        return jsonify({'syntax': False, 'warnings': [], 'errors': [str(e)]})

@app.route('/execute', methods=['POST'])
def execute():
    try:
        code = request.json.get('code', '')
        print(f"\n=== Executing CadQuery code ===\n{code}\n")
        
        code_clean = code.replace('import cadquery as cq', '').strip()
        
        result_obj = None
        def show_object(obj):
            nonlocal result_obj
            result_obj = obj
        
        exec_globals = {'cq': cq, 'show_object': show_object, 'math': __import__('math')}
        exec(code_clean, exec_globals)
        
        if result_obj is None:
            return jsonify({'error': 'No result generated - show_object() was not called'}), 400
        
        print("Converting to mesh...")
        vertices, faces, normals = convert_to_mesh(result_obj)
        print(f"Mesh generated: {len(vertices)//3} vertices, {len(faces)//3} triangles")

        return jsonify({
            'vertices': vertices,
            'faces': faces,
            'normals': normals
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/export', methods=['POST'])
def export_stl():
    try:
        code = request.json.get('code', '')
        print(f"\n=== Exporting to STL ===")
        
        # Nettoyer le code
        code_clean = code.replace('import cadquery as cq', '').strip()
        
        # Exécuter le code
        result_obj = None
        def show_object(obj):
            nonlocal result_obj
            result_obj = obj
        
        exec_globals = {'cq': cq, 'show_object': show_object, 'math': __import__('math')}
        
        try:
            exec(code_clean, exec_globals)
        except Exception as exec_error:
            print(f"Execution error: {str(exec_error)}")
            return jsonify({'error': f'Code execution failed: {str(exec_error)}'}), 400
        
        if result_obj is None:
            print("ERROR: No result generated")
            return jsonify({'error': 'No result generated - show_object() was not called'}), 400
        
        # Vérifier que c'est un objet valide
        if not hasattr(result_obj, 'val'):
            print("ERROR: Invalid result object")
            return jsonify({'error': 'Invalid result object'}), 400
        
        # Export vers STL
        print("Exporting to STL format...")
        
        try:
            # Utiliser exportStl() de CadQuery
            stl_bytes = result_obj.val().exportStl()
            
            if isinstance(stl_bytes, str):
                stl_bytes = stl_bytes.encode('utf-8')
            
            print(f"STL generated: {len(stl_bytes)} bytes")
            
            return Response(
                stl_bytes,
                mimetype='application/octet-stream',
                headers={
                    'Content-Disposition': 'attachment; filename="model.stl"',
                    'Content-Type': 'application/octet-stream'
                }
            )
            
        except Exception as export_error:
            print(f"Export error: {str(export_error)}")
            return jsonify({'error': f'STL export failed: {str(export_error)}'}), 500
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

def convert_to_mesh(shape):
    """Convertit un objet CadQuery en mesh Three.js avec normales calculées"""
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_FACE
    from OCP.TopExp import TopExp_Explorer
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS
    from OCP.gp import gp_Vec, gp_Pnt
    import math
    
    vertices = []
    faces = []
    normals = []
    
    ocp_shape = shape.val().wrapped
    
    # Maillage de bonne qualité
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
            
            # Extraire triangles et calculer normales
            face_orientation = face.Orientation()
            
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                n1, n2, n3 = triangle.Get()
                
                # Indices des sommets
                idx1 = n1 - 1 + vertex_offset
                idx2 = n2 - 1 + vertex_offset
                idx3 = n3 - 1 + vertex_offset
                
                # Ordre des faces selon orientation
                if face_orientation == 1:  # TopAbs_REVERSED
                    faces.extend([idx1, idx3, idx2])
                else:
                    faces.extend([idx1, idx2, idx3])
            
            # Calculer les normales pour chaque vertex (moyenne des triangles adjacents)
            vertex_normals = {}
            
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                n1, n2, n3 = triangle.Get()
                
                # Positions des 3 sommets
                v1 = face_vertices[n1 - 1]
                v2 = face_vertices[n2 - 1]
                v3 = face_vertices[n3 - 1]
                
                # Calculer normale du triangle (produit vectoriel)
                edge1 = (v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2])
                edge2 = (v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2])
                
                # Produit vectoriel
                nx = edge1[1] * edge2[2] - edge1[2] * edge2[1]
                ny = edge1[2] * edge2[0] - edge1[0] * edge2[2]
                nz = edge1[0] * edge2[1] - edge1[1] * edge2[0]
                
                # Normaliser
                length = math.sqrt(nx*nx + ny*ny + nz*nz)
                if length > 0:
                    nx /= length
                    ny /= length
                    nz /= length
                
                # Inverser si face reversed
                if face_orientation == 1:
                    nx, ny, nz = -nx, -ny, -nz
                
                # Accumuler pour chaque vertex du triangle
                for idx in [n1 - 1, n2 - 1, n3 - 1]:
                    if idx not in vertex_normals:
                        vertex_normals[idx] = [0.0, 0.0, 0.0]
                    vertex_normals[idx][0] += nx
                    vertex_normals[idx][1] += ny
                    vertex_normals[idx][2] += nz
            
            # Normaliser et ajouter les normales moyennes
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
    print("Starting CadQuery server on port 8788...")
    app.run(host='0.0.0.0', port=8788, debug=True)