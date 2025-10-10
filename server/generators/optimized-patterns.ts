// server/generators/optimized-patterns.ts - Patterns optimisés pour performance

export class OptimizedPatterns {
    /**
     * Gyroid lattice optimisé (évite timeout)
     */
    static gyroidLattice(params: any): string {
        const {
            size = 50.0,
            unitCellSize = 10.0, // IMPORTANT: min 10mm
            thickness = 0.8,
            porosity = 0.7
        } = params

        const cells = Math.floor(size / unitCellSize)

        return `import cadquery as cq

# Gyroid Lattice - Optimized for Performance
size = ${size}
unit_cell = ${unitCellSize}  # Large cells to avoid timeout
thickness = ${thickness}

cells = ${cells}  # Total: ${cells * cells * cells} cells
result = None

print(f"Generating {cells}x{cells}x{cells} lattice...")

# Use phase-based strut generation (gyroid approximation)
for i in range(cells):
    for j in range(cells):
        for k in range(cells):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            # Gyroid-like phase selection
            phase = (i + j + k) % 3
            
            if phase == 0:
                # Diagonal strut XY plane
                strut = (cq.Workplane("XY")
                    .center(x + unit_cell/2.0, y + unit_cell/2.0)
                    .workplane(offset=z)
                    .circle(thickness/2.0)
                    .extrude(unit_cell * 1.41))
                result = result.union(strut) if result else strut
            elif phase == 1:
                # Diagonal strut YZ plane
                strut = (cq.Workplane("YZ")
                    .workplane(offset=x)
                    .center(y + unit_cell/2.0, z + unit_cell/2.0)
                    .circle(thickness/2.0)
                    .extrude(unit_cell * 1.41))
                result = result.union(strut) if result else strut
    
    # Progress indicator
    if (i + 1) % 2 == 0:
        print(f"Progress: {((i+1)/cells)*100:.0f}%")

# Trim to bounding box
bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

print("✅ Lattice generation complete")
show_object(result)
`
    }

    /**
     * McKibben actuator optimisé
     */
    static mckibbenActuator(params: any): string {
        const {
            length = 100.0,
            diameter = 20.0,
            filamentCount = 12, // Réduit de 45 à 12
            filamentThickness = 0.5,
            helixAngle = 30.0
        } = params

        return `import cadquery as cq
import math

# McKibben Actuator - Optimized (${filamentCount} filaments)
length = ${length}
diameter = ${diameter}
filament_count = ${filamentCount}
filament_thickness = ${filamentThickness}
helix_angle = ${helixAngle}

radius = diameter / 2.0

# Main cylindrical body
body = cq.Workplane("XY").circle(radius).extrude(length)

# Inner cavity (bladder)
bladder_radius = radius - 2.0
bladder = cq.Workplane("XY").circle(bladder_radius).extrude(length - 4.0).translate((0, 0, 2.0))
body = body.cut(bladder)

# Braided filaments (helical pattern)
# Using sweep instead of many small segments
pitch = length / 3.0  # 3 complete turns

for i in range(filament_count):
    angle_offset = (360.0 / filament_count) * i
    
    # Create helical path
    points = []
    segments = 30  # Reasonable detail
    
    for j in range(segments + 1):
        t = j / segments
        z = t * length
        angle = angle_offset + (t * 360.0 * 3.0)  # 3 turns
        x = radius * math.cos(math.radians(angle))
        y = radius * math.sin(math.radians(angle))
        points.append((x, y, z))
    
    # Create path and sweep circle along it
    path = cq.Workplane("XY").spline(points)
    filament = (cq.Workplane("YZ")
        .circle(filament_thickness / 2.0)
        .sweep(path))
    
    body = body.union(filament)

# End caps
cap_thickness = 3.0
cap_bottom = (cq.Workplane("XY")
    .circle(radius + 1.0)
    .extrude(cap_thickness))

cap_top = (cq.Workplane("XY")
    .workplane(offset=length - cap_thickness)
    .circle(radius + 1.0)
    .extrude(cap_thickness))

result = body.union(cap_bottom).union(cap_top)

# Smooth edges
try:
    result = result.edges("|Z").fillet(0.5)
except:
    pass

show_object(result)
`
    }

    /**
     * Wrist splint optimisé
     */
    static wristSplint(params: any): string {
        const {
            length = 180.0,
            width = 70.0,
            thickness = 3.0,
            palmAngle = 15.0
        } = params

        return `import cadquery as cq

# Adaptive Wrist Splint - Simplified
length = ${length}
width = ${width}
thickness = ${thickness}
palm_angle = ${palmAngle}

# Base plate (forearm section)
base = cq.Workplane("XY").box(length * 0.6, width, thickness)

# Palm section (angled)
palm = (cq.Workplane("XY")
    .workplane(offset=thickness)
    .box(length * 0.4, width, thickness * 4.0)
    .rotate((0, 0, 0), (1, 0, 0), palm_angle)
    .translate((length * 0.25, 0, 0)))

result = base.union(palm)

# Ventilation holes (simplified pattern)
hole_spacing = 15.0
holes_x = int(length * 0.5 / hole_spacing)
holes_y = int(width * 0.6 / hole_spacing)

hole_pattern = (cq.Workplane("XY")
    .rarray(hole_spacing, hole_spacing, holes_x, holes_y)
    .circle(3.0)
    .extrude(thickness * 2.0))

result = result.cut(hole_pattern)

# Strap slots
for i in range(3):
    slot_pos = -length * 0.25 + i * length * 0.25
    slot = (cq.Workplane("XY")
        .workplane(offset=thickness/2.0)
        .center(slot_pos, 0)
        .rect(8.0, width * 0.9)
        .cutThruAll())
    result = result.cut(slot)

# Smooth edges
try:
    result = result.edges().fillet(1.0)
except:
    pass

show_object(result)
`
    }
}