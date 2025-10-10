// server/prompts/cadquery-safe-patterns.ts
export class CadQuerySafePatterns {
    static PROVEN_PATTERNS = {
        stent_simple: `import cadquery as cq
import math

length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
result = None

for ring_idx in range(rings):
    z = ring_idx * ring_spacing
    
    for i in range(12):
        angle = math.radians((360.0 / 12) * i)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        
        strut = (cq.Workplane("XY")
            .workplane(offset=z)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(ring_spacing * 0.6))
        
        result = result.union(strut) if result else strut

show_object(result)`,

        box_simple: `import cadquery as cq

width = 50.0
height = 30.0
depth = 20.0

result = cq.Workplane("XY").box(width, height, depth)

show_object(result)`,

        cylinder_simple: `import cadquery as cq

diameter = 20.0
height = 50.0

radius = diameter / 2.0
result = cq.Workplane("XY").circle(radius).extrude(height)

show_object(result)`
    }
}