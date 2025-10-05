# python/cadquery-server/server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import cadquery as cq
import numpy as np
import json
import base64
import tempfile
import os
import traceback

app = Flask(__name__)
CORS(app)

def mesh_to_dict(mesh):
    """Convert CadQuery mesh to dictionary"""
    vertices = []
    faces = []
    normals = []
    
    # Extract vertices and faces
    for vertex in mesh.vertices():
        vertices.extend([vertex.X, vertex.Y, vertex.Z])
    
    for face in mesh.faces():
        # Get face triangulation
        # This is simplified - real implementation would use proper triangulation
        face_vertices = []
        for edge in face.edges():
            for vertex in edge.vertices():
                face_vertices.append(vertex)
        
        if len(face_vertices) >= 3:
            # Create triangles from face vertices
            for i in range(1, len(face_vertices) - 1):
                faces.extend([0, i, i+1])
    
    return {
        "vertices": vertices,
        "faces": faces,
        "normals": normals
    }

@app.route('/validate', methods=['POST'])
def validate():
    """Validate CadQuery code"""
    try:
        code = request.json.get('code', '')
        
        # Create a safe execution environment
        safe_globals = {
            'cq': cq,
            'np': np,
            '__builtins__': {}
        }
        
        # Try to compile the code
        compile(code, '<string>', 'exec')
        
        return jsonify({
            'syntax': True,
            'warnings': [],
            'errors': []
        })
        
    except SyntaxError as e:
        return jsonify({
            'syntax': False,
            'warnings': [],
            'errors': [str(e)]
        })
    except Exception as e:
        return jsonify({
            'syntax': True,
            'warnings': [str(e)],
            'errors': []
        })

@app.route('/execute', methods=['POST'])
def execute():
    """Execute CadQuery code and return mesh"""
    try:
        code = request.json.get('code', '')
        format_type = request.json.get('format', 'mesh')
        
        # Create execution environment
        safe_globals = {
            'cq': cq,
            'np': np,
            '__builtins__': {},
            'result': None,
            'show_object': lambda x: safe_globals.update({'result': x})
        }
        
        # Execute the code
        exec(code, safe_globals)
        
        result = safe_globals.get('result')
        
        if result is None:
            return jsonify({'error': 'No result generated'}), 400
        
        if format_type == 'mesh':
            # Convert to mesh format
            mesh_data = mesh_to_dict(result)
            return jsonify(mesh_data)
            
        elif format_type == 'stl':
            # Export as STL
            with tempfile.NamedTemporaryFile(suffix='.stl', delete=False) as tmp:
                result.exportStl(tmp.name)
                with open(tmp.name, 'rb') as f:
                    stl_data = base64.b64encode(f.read()).decode('utf-8')
                os.unlink(tmp.name)
            return jsonify({'stl': stl_data})
            
        elif format_type == 'step':
            # Export as STEP
            with tempfile.NamedTemporaryFile(suffix='.step', delete=False) as tmp:
                result.exportStep(tmp.name)
                with open(tmp.name, 'rb') as f:
                    step_data = base64.b64encode(f.read()).decode('utf-8')
                os.unlink(tmp.name)
            return jsonify({'step': step_data})
            
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'cadquery_version': cq.__version__
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8788, debug=True)