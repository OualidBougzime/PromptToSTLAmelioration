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
        
        exec_globals = {'cq': cq, 'show_object': show_object}
        exec(code_clean, exec_globals)
        
        if result_obj is None:
            return jsonify({'error': 'No result generated - show_object() was not called'}), 400
        
        print("Converting to mesh...")
        vertices, faces = convert_to_mesh(result_obj)
        print(f"Mesh generated: {len(vertices)//3} vertices, {len(faces)//3} triangles")
        
        return jsonify({
            'vertices': vertices,
            'faces': faces,
            'normals': []
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
        
        code_clean = code.replace('import cadquery as cq', '').strip()
        
        result_obj = None
        def show_object(obj):
            nonlocal result_obj
            result_obj = obj
        
        exec_globals = {'cq': cq, 'show_object': show_object}
        exec(code_clean, exec_globals)
        
        if result_obj is None:
            return jsonify({'error': 'No result generated'}), 400
        
        # Export to STL
        print("Exporting to STL format...")
        stl_string = result_obj.val().exportStl()
        
        print(f"STL generated: {len(stl_string)} bytes")
        
        return Response(
            stl_string,
            mimetype='application/octet-stream',
            headers={
                'Content-Disposition': 'attachment; filename=model.stl'
            }
        )
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

def convert_to_mesh(shape):
    """Convertit un objet CadQuery en mesh Three.js"""
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_FACE
    from OCP.TopExp import TopExp_Explorer
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS
    
    vertices = []
    faces = []
    
    ocp_shape = shape.val().wrapped
    
    BRepMesh_IncrementalMesh(ocp_shape, 0.1, False, 0.5, True)
    
    vertex_offset = 0
    face_explorer = TopExp_Explorer(ocp_shape, TopAbs_FACE)
    
    while face_explorer.More():
        face = TopoDS.Face_s(face_explorer.Current())
        location = TopLoc_Location()
        triangulation = BRep_Tool.Triangulation_s(face, location)
        
        if triangulation:
            for i in range(1, triangulation.NbNodes() + 1):
                node = triangulation.Node(i)
                vertices.extend([node.X(), node.Y(), node.Z()])
            
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                n1, n2, n3 = triangle.Get()
                faces.extend([
                    n1 - 1 + vertex_offset,
                    n2 - 1 + vertex_offset,
                    n3 - 1 + vertex_offset
                ])
            
            vertex_offset += triangulation.NbNodes()
        
        face_explorer.Next()
    
    return vertices, faces

if __name__ == '__main__':
    print("Starting CadQuery server on port 8788...")
    app.run(host='0.0.0.0', port=8788, debug=True)