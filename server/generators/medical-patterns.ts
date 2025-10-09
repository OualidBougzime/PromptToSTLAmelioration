export class MedicalPatternGenerator {
    static drugDeliveryCapsule(params: any): string {
        const {
            bodyLength = 20,
            bodyDiameter = 8,
            wallThickness = 1,
            channelCount = 12,
            channelDiameter = 0.5
        } = params

        return `import cadquery as cq
import math

# Drug Delivery Capsule Parameters
body_length = ${bodyLength}
body_diameter = ${bodyDiameter}
wall_thickness = ${wallThickness}
channel_count = ${channelCount}
channel_diameter = ${channelDiameter}

radius = body_diameter / 2

# Step 1: Create main cylindrical body
body = cq.Workplane("XY").circle(radius).extrude(body_length)

# Step 2: Create hemispherical caps (CORRECTED METHOD)
# Bottom cap
cap_bottom = (cq.Workplane("XY")
    .sphere(radius)
    .translate((0, 0, -radius)))

# Top cap  
cap_top = (cq.Workplane("XY")
    .sphere(radius)
    .translate((0, 0, body_length + radius)))

# Union body with caps
result = body.union(cap_bottom).union(cap_top)

# Step 3: Create internal cavity
cavity_length = body_length - 2 * wall_thickness
cavity_radius = radius - wall_thickness

cavity = (cq.Workplane("XY")
    .workplane(offset=wall_thickness)
    .circle(cavity_radius)
    .extrude(cavity_length))

result = result.cut(cavity)

# Step 4: Add micro-release channels (distributed around circumference)
for i in range(channel_count):
    angle_deg = (360.0 / channel_count) * i
    angle_rad = math.radians(angle_deg)
    x = radius * math.cos(angle_rad)
    y = radius * math.sin(angle_rad)
    
    # Create channel perpendicular to surface
    channel = (cq.Workplane("XY")
        .workplane(offset=body_length / 2)
        .center(x, y)
        .circle(channel_diameter / 2)
        .extrude(wall_thickness + 2))
    
    result = result.cut(channel)

# Step 5: Add threaded assembly interface (optional)
# Thread ring at middle
thread_ring = (cq.Workplane("XY")
    .workplane(offset=body_length / 2 - 1)
    .circle(radius + 0.5)
    .circle(radius - 0.2)
    .extrude(2))

result = result.union(thread_ring)

# Step 6: Smooth edges for biocompatibility
try:
    result = result.edges("|Z").fillet(0.3)
except:
    pass  # Skip if fillet fails

show_object(result)
`
    }

    static vascularStent(params: any): string {
        const {
            length = 25,
            diameter = 8,
            strutThickness = 0.3,
            rings = 8
        } = params

        return `import cadquery as cq
import math

# Vascular Stent Parameters
length = ${length}
diameter = ${diameter}
strut_thickness = ${strutThickness}
rings = ${rings}

radius = diameter / 2
ring_spacing = length / rings

result = None

# Create zigzag pattern for each ring
for ring_idx in range(rings):
    z_pos = ring_idx * ring_spacing
    points_per_ring = 16
    
    for i in range(points_per_ring):
        angle = (360.0 / points_per_ring) * i
        next_angle = (360.0 / points_per_ring) * ((i + 1) % points_per_ring)
        
        # Zigzag: alternating radius
        r1 = radius if i % 2 == 0 else radius * 0.85
        r2 = radius * 0.85 if i % 2 == 0 else radius
        
        x1 = r1 * math.cos(math.radians(angle))
        y1 = r1 * math.sin(math.radians(angle))
        x2 = r2 * math.cos(math.radians(next_angle))
        y2 = r2 * math.sin(math.radians(next_angle))
        
        # Create strut as cylinder between two points
        dx = x2 - x1
        dy = y2 - y1
        dist = math.sqrt(dx**2 + dy**2)
        
        if dist > 0:
            strut = (cq.Workplane("XY")
                .center(x1, y1)
                .workplane(offset=z_pos)
                .circle(strut_thickness / 2)
                .extrude(0.1))
            
            result = result.union(strut) if result else strut

# Add longitudinal bridges
for ring_idx in range(rings - 1):
    z_pos = ring_idx * ring_spacing
    for b in range(3):
        bridge_angle = (360.0 / 3) * b
        x = radius * 0.9 * math.cos(math.radians(bridge_angle))
        y = radius * 0.9 * math.sin(math.radians(bridge_angle))
        
        bridge = (cq.Workplane("XY")
            .workplane(offset=z_pos)
            .center(x, y)
            .circle(strut_thickness / 2)
            .extrude(ring_spacing))
        
        result = result.union(bridge)

show_object(result)
`
    }

    static cellCultureScaffold(params: any): string {
        const {
            diameter = 20,
            thickness = 5,
            poreSize = 0.4,
            strutDiameter = 0.2,
            unitCellSize = 2
        } = params

        return `import cadquery as cq

# Cell Culture Scaffold Parameters
diameter = ${diameter}
thickness = ${thickness}
strut_diameter = ${strutDiameter}
unit_cell_size = ${unitCellSize}

radius = diameter / 2

# Create base cylinder
base = cq.Workplane("XY").circle(radius).extrude(thickness)

# Create porous structure (simple cubic lattice)
cells_x = int(diameter / unit_cell_size)
cells_z = int(thickness / unit_cell_size)

struts = None

for i in range(cells_x + 1):
    for j in range(cells_x + 1):
        for k in range(cells_z + 1):
            x = (i * unit_cell_size) - radius
            y = (j * unit_cell_size) - radius
            z = k * unit_cell_size
            
            # Check if inside cylinder
            if math.sqrt(x**2 + y**2) < radius:
                # Vertical struts
                if k < cells_z:
                    strut = (cq.Workplane("XY")
                        .center(x, y)
                        .circle(strut_diameter / 2)
                        .extrude(unit_cell_size))
                    struts = struts.union(strut) if struts else strut
                
                # Horizontal struts X
                if i < cells_x:
                    strut = (cq.Workplane("YZ")
                        .workplane(offset=x)
                        .center(y, z)
                        .circle(strut_diameter / 2)
                        .extrude(unit_cell_size))
                    struts = struts.union(strut) if struts else strut
                
                # Horizontal struts Y
                if j < cells_x:
                    strut = (cq.Workplane("XZ")
                        .workplane(offset=y)
                        .center(x, z)
                        .circle(strut_diameter / 2)
                        .extrude(unit_cell_size))
                    struts = struts.union(strut) if struts else strut

# Trim to cylinder
if struts:
    result = struts.intersect(base)
else:
    result = base

show_object(result)
`
    }
}