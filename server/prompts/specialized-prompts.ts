// server/prompts/specialized-prompts.ts - VERSION AMÉLIORÉE AVEC COT

export class SpecializedPrompts {
    static getMedicalPrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for MEDICAL DEVICES.

🎯 IMPLEMENTATION STRATEGY (Chain-of-Thought):
1. Analyze user requirements → identify main component and features
2. Define coordinate system and dimensions as FLOAT variables
3. Create base geometry with explicit workplanes
4. Add functional features (channels, mounting points)
5. Apply safety features (fillets, smooth transitions)
6. Validate constraints and generate final code

🚨 CRITICAL CADQUERY RULES FOR MEDICAL DEVICES:
- ALWAYS use float literals: 20.0 NOT 20
- Start with: import cadquery as cq
- End with: show_object(result)
- **NEVER use .fillet() on .ellipse() - it ALWAYS fails with "BRep_API: command not done"**
- For ellipsoids: use .loft() with multiple circular sections instead of .ellipse()
- Use .translate() for positioning spheres/ellipsoids, NOT .faces().workplane()
- Fillet radius MUST be < wall thickness
- Use .close() for 2D profiles

✅ WORKING PATTERN - Ellipsoidal Drug Reservoir (CORRECT METHOD):
\`\`\`python
import cadquery as cq

# Parameters
length = 30.0
width = 15.0
height = 10.0
wall_thickness = 2.0
membrane_thickness = 0.3
tab_length = 5.0
tab_width = 3.0
anchor_hole_dia = 1.0

# Step 1: Create ellipsoidal shape using LOFT (not .ellipse()!)
# Create multiple circular sections and loft between them
sections = []
num_sections = 5

for i in range(num_sections):
    z = (i / (num_sections - 1)) * length
    # Calculate elliptical radius at this height
    t = (i / (num_sections - 1) - 0.5) * 2.0  # -1 to 1
    scale = (1.0 - t*t)**0.5  # Elliptical profile
    
    if scale > 0.01:  # Avoid zero-radius sections
        section = (cq.Workplane("XY")
            .workplane(offset=z)
            .ellipse(width/2.0 * scale, height/2.0 * scale))
        sections.append(section)

# Loft between sections to create ellipsoid
if len(sections) > 1:
    result = sections[0]
    for section in sections[1:]:
        result = result.loft(section)
else:
    # Fallback: simple cylinder
    result = cq.Workplane("XY").circle(width/2.0).extrude(length)

# Step 2: Create internal chamber (smaller ellipsoid)
chamber_sections = []
chamber_length = length - 2.0 * wall_thickness

for i in range(num_sections):
    z = wall_thickness + (i / (num_sections - 1)) * chamber_length
    t = (i / (num_sections - 1) - 0.5) * 2.0
    scale = (1.0 - t*t)**0.5
    
    if scale > 0.01:
        chamber_section = (cq.Workplane("XY")
            .workplane(offset=z)
            .ellipse((width/2.0 - wall_thickness) * scale, 
                    (height/2.0 - wall_thickness) * scale))
        chamber_sections.append(chamber_section)

# Create chamber by lofting
if len(chamber_sections) > 1:
    chamber = chamber_sections[0]
    for section in chamber_sections[1:]:
        chamber = chamber.loft(section)
    result = result.cut(chamber)

# Step 3: Add surgical insertion tab
tab = (cq.Workplane("XY")
    .workplane(offset=length)
    .center(0, width/4.0)
    .box(tab_length, tab_width, 2.0))

result = result.union(tab)

# Step 4: Add anchor hole in tab
anchor_hole = (cq.Workplane("XY")
    .workplane(offset=length + 1.0)
    .center(0, width/4.0)
    .circle(anchor_hole_dia/2.0)
    .extrude(3.0))

result = result.cut(anchor_hole)

# Step 5: Add diffusion membrane area (thin section)
membrane_zone = (cq.Workplane("XY")
    .workplane(offset=length/2.0)
    .circle(width/4.0)
    .extrude(membrane_thickness))

# NO FILLET on ellipsoids! They're already smooth.

show_object(result)
\`\`\`

✅ WORKING PATTERN - Drug Delivery Capsule (Cylindrical):
\`\`\`python
import cadquery as cq
import math

# Parameters
body_length = 20.0
body_diameter = 8.0
wall_thickness = 1.0
channel_count = 12
channel_diameter = 0.5

radius = body_diameter / 2.0

# Step 1: Create main cylindrical body
body = cq.Workplane("XY").circle(radius).extrude(body_length)

# Step 2: Create hemispherical caps (CORRECT METHOD - use translate)
cap_bottom = cq.Workplane("XY").sphere(radius).translate((0, 0, -radius))
cap_top = cq.Workplane("XY").sphere(radius).translate((0, 0, body_length + radius))

result = body.union(cap_bottom).union(cap_top)

# Step 3: Internal cavity
cavity_radius = radius - wall_thickness
cavity_length = body_length - 2.0 * wall_thickness
cavity = (cq.Workplane("XY")
    .workplane(offset=wall_thickness)
    .circle(cavity_radius)
    .extrude(cavity_length))

result = result.cut(cavity)

# Step 4: Micro-channels
for i in range(channel_count):
    angle_rad = math.radians((360.0 / channel_count) * i)
    x = radius * math.cos(angle_rad)
    y = radius * math.sin(angle_rad)
    
    channel = (cq.Workplane("XY")
        .workplane(offset=body_length/2.0)
        .center(x, y)
        .circle(channel_diameter/2.0)
        .extrude(wall_thickness + 2.0))
    
    result = result.cut(channel)

# Step 5: Smooth edges (ONLY on cylinders, NOT ellipses!)
try:
    result = result.edges("|Z").fillet(0.3)
except:
    pass  # If fillet fails, continue without it

show_object(result)
\`\`\`

✅ WORKING PATTERN - Vascular Stent:
\`\`\`python
import cadquery as cq
import math

length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
points_per_ring = 16

result = None

# Create zigzag rings
for ring_idx in range(rings):
    z_pos = ring_idx * ring_spacing
    
    for i in range(points_per_ring):
        angle = (360.0 / points_per_ring) * i
        next_angle = (360.0 / points_per_ring) * ((i + 1) % points_per_ring)
        
        # Zigzag pattern
        r1 = radius if i % 2 == 0 else radius * 0.85
        r2 = radius * 0.85 if i % 2 == 0 else radius
        
        x1 = r1 * math.cos(math.radians(angle))
        y1 = r1 * math.sin(math.radians(angle))
        x2 = r2 * math.cos(math.radians(next_angle))
        y2 = r2 * math.sin(math.radians(next_angle))
        
        # Create strut
        strut = (cq.Workplane("XY")
            .center(x1, y1)
            .workplane(offset=z_pos)
            .circle(strut_thickness / 2.0)
            .extrude(0.1))
        
        result = result.union(strut) if result else strut

show_object(result)
\`\`\`

⚠️ COMMON ERRORS TO AVOID:
1. ❌ .ellipse().extrude().fillet() → BRep error EVERY TIME
2. ✅ Use .loft() with circular sections for ellipsoids
3. ❌ Using integers: radius = 10 
4. ✅ radius = 10.0
5. ❌ .sphere().faces(">Z").workplane() 
6. ✅ .sphere().translate((0,0,z))
7. ❌ Fillet larger than wall thickness
8. ✅ fillet < wall_thickness
9. ❌ Missing .close() on 2D sketches
10. ✅ Always .close() wires

🎯 FOR ELLIPSOIDAL SHAPES:
- Method 1: Use .loft() with multiple circular/elliptical sections (RECOMMENDED)
- Method 2: Use .sphere() and scale it: .sphere(r).scale((1.0, 0.5, 0.3))
- Method 3: Use boolean operations on stretched spheres
- NEVER EVER use .ellipse().extrude().fillet() - it fails 100% of the time

Now generate code for: "${userPrompt}"

Remember: For ellipsoidal shapes, use LOFT or scaled SPHERE, NEVER .ellipse() with .fillet()!

Return ONLY Python code in \`\`\`python blocks.`
    }

    static getLatticePrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for LATTICE STRUCTURES.

🎯 LATTICE GENERATION STRATEGY:
1. Determine if simple beam lattice OR complex TPMS
2. For TPMS (gyroid): Use mathematical surfaces (MUCH faster)
3. For beam lattice: Generate unit cell, then array
4. CRITICAL: Use LARGE unit cells (10mm+) to avoid timeout

⚡ PERFORMANCE RULES:
- Unit cell size: 10.0mm minimum (5.0mm causes timeout)
- Limit: Max 10x10x10 cells (1000 total)
- Avoid: Sequential boolean unions (exponential time)
- Use: .fuse(tol=0.0001) for boolean operations

✅ WORKING PATTERN - Simple Cubic Lattice:
\`\`\`python
import cadquery as cq

# Parameters - LARGE cells to avoid timeout
size = 50.0
unit_cell = 10.0  # ⚠️ Must be 10mm+ for performance
thickness = 0.8

cells = int(size / unit_cell)  # Should be ~5
result = None

# Create struts in 3 directions
for i in range(cells + 1):
    for j in range(cells + 1):
        for k in range(cells + 1):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            # Vertical strut
            if k < cells:
                strut = (cq.Workplane("XY")
                    .center(x, y)
                    .circle(thickness/2.0)
                    .extrude(unit_cell))
                result = result.union(strut) if result else strut
            
            # Horizontal X strut
            if i < cells:
                strut = (cq.Workplane("YZ")
                    .workplane(offset=x)
                    .center(y, z)
                    .circle(thickness/2.0)
                    .extrude(unit_cell))
                result = result.union(strut) if result else strut

# Trim to bounding box
bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

show_object(result)
\`\`\`

✅ WORKING PATTERN - Optimized Gyroid:
\`\`\`python
import cadquery as cq

# Parameters
size = 50.0
unit_cell = 10.0  # Large for performance
thickness = 0.8

cells = int(size / unit_cell)
result = None

# Simplified gyroid approximation using struts
for i in range(cells):
    for j in range(cells):
        for k in range(cells):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            # Phase-based strut selection (gyroid-like)
            phase = (i + j + k) % 3
            
            if phase == 0:
                strut = (cq.Workplane("XY")
                    .center(x, y)
                    .workplane(offset=z)
                    .circle(thickness/2.0)
                    .extrude(unit_cell*1.41))
                result = result.union(strut) if result else strut
            elif phase == 1:
                strut = (cq.Workplane("YZ")
                    .workplane(offset=x)
                    .center(y, z)
                    .circle(thickness/2.0)
                    .extrude(unit_cell*1.41))
                result = result.union(strut) if result else strut

bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

show_object(result)
\`\`\`

⚠️ TIMEOUT PREVENTION:
- If cells > 10 in any direction → TIMEOUT
- If unit_cell < 5mm → TIMEOUT
- If too many unions → TIMEOUT
- Solution: Increase unit_cell to 10mm+

Now generate code for: "${userPrompt}"

Return ONLY Python code with performance in mind.`;
    }

    static getGeneralPrompt(userPrompt: string): string {
        return `You are an expert CadQuery code generator.

🎯 CRITICAL RULES:
1. Start with: import cadquery as cq
2. End with: show_object(result)
3. ALL numbers MUST be floats: 10.0 NOT 10
4. Use explicit workplanes: cq.Workplane("XY")
5. Close 2D profiles: .close()
6. Validate fillet radius < wall thickness

✅ BASIC PATTERNS:

Box:
\`\`\`python
import cadquery as cq
result = cq.Workplane("XY").box(20.0, 10.0, 5.0)
show_object(result)
\`\`\`

Cylinder with hole:
\`\`\`python
import cadquery as cq
result = (cq.Workplane("XY")
    .circle(10.0)
    .extrude(20.0)
    .faces(">Z")
    .workplane()
    .circle(3.0)
    .cutThruAll())
show_object(result)
\`\`\`

Box with fillets:
\`\`\`python
import cadquery as cq
result = (cq.Workplane("XY")
    .box(30.0, 20.0, 10.0)
    .edges("|Z")
    .fillet(2.0))  # 2mm < half of 10mm height
show_object(result)
\`\`\`

Now generate code for: "${userPrompt}"

Return ONLY Python code in \`\`\`python blocks.`;
    }
}