// server/generators/pattern-generators.ts
export class PatternGenerators {
    static phoneHolder(params: any): string {
        const { phoneWidth, phoneHeight, phoneThickness, angle, baseWidth, baseDepth } = params

        return `import cadquery as cq

# Phone Holder Parameters
phone_width = ${phoneWidth}
phone_height = ${phoneHeight}
phone_thickness = ${phoneThickness}
angle = ${angle}
base_width = ${baseWidth}
base_depth = ${baseDepth}

# Create base
base = cq.Workplane("XY").box(base_width, base_depth, 5)

# Create back support (angled)
back = (cq.Workplane("XY")
    .workplane(offset=5)
    .center(0, -base_depth/4)
    .box(phone_width + 4, 20, phone_height * 0.6)
    .rotate((0,0,0), (1,0,0), -angle))

# Create bottom lip
lip = (cq.Workplane("XY")
    .workplane(offset=5)
    .center(0, base_depth/4)
    .box(phone_width + 4, 10, 5))

# Combine all parts
result = base.union(back).union(lip)

# Add phone slot
slot = (cq.Workplane("XY")
    .workplane(offset=5)
    .box(phone_width, phone_thickness + 2, phone_height))

result = result.cut(slot)

show_object(result)
`
    }

    static enclosure(params: any): string {
        const { width, height, depth, wallThickness, hasLid, ventilation } = params

        return `import cadquery as cq

# Enclosure Parameters
width = ${width}
height = ${height}
depth = ${depth}
wall = ${wallThickness}

# Create outer box
outer = cq.Workplane("XY").box(width, depth, height)

# Create inner cavity
inner = (cq.Workplane("XY")
    .workplane(offset=wall)
    .box(width - 2*wall, depth - 2*wall, height))

# Hollow out
result = outer.cut(inner)

# Add mounting holes in base
result = (result
    .faces("<Z")
    .workplane()
    .rarray(width - 10, depth - 10, 2, 2)
    .circle(2)
    .cutThruAll())

${ventilation ? `
# Add ventilation slots
for i in range(5):
    slot = (cq.Workplane("YZ")
        .center(0, height/2)
        .rect(2, height - 20)
        .extrude(width/2)
        .translate((width/2 - 10 - i*5, 0, 0)))
    result = result.cut(slot)
` : ''}

${hasLid ? `
# Create lid
lid = (cq.Workplane("XY")
    .workplane(offset=height)
    .box(width - wall, depth - wall, wall + 5))
` : ''}

show_object(result)
`
    }

    static motorMount(params: any): string {
        const { motorDiameter, shaftDiameter, mountingHoles, holeDistance, baseThickness } = params

        return `import cadquery as cq

# Motor Mount Parameters
motor_dia = ${motorDiameter}
shaft_dia = ${shaftDiameter}
base_size = ${holeDistance + 20}
thickness = ${baseThickness}

# Create base plate
result = (cq.Workplane("XY")
    .box(base_size, base_size, thickness))

# Add motor clamp ring
clamp = (cq.Workplane("XY")
    .workplane(offset=thickness)
    .circle(motor_dia/2 + 3)
    .circle(motor_dia/2)
    .extrude(10))

result = result.union(clamp)

# Add shaft hole
result = (result
    .faces(">Z")
    .workplane()
    .circle(shaft_dia/2)
    .cutThruAll())

# Add mounting holes
result = (result
    .faces("<Z")
    .workplane()
    .rarray(${holeDistance}, ${holeDistance}, 2, 2)
    .circle(2)
    .cutThruAll())

show_object(result)
`
    }

    static cableClip(params: any): string {
        const { cableDiameter, clipWidth, mountType } = params

        return `import cadquery as cq

# Cable Clip Parameters
cable_dia = ${cableDiameter}
clip_width = ${clipWidth}

# Create base
result = (cq.Workplane("XY")
    .box(clip_width, clip_width, 3))

# Create U-shaped clip
clip = (cq.Workplane("XY")
    .workplane(offset=3)
    .circle(cable_dia/2 + 2)
    .circle(cable_dia/2)
    .extrude(clip_width * 0.6)
    .faces(">Z")
    .shell(-1.5))

result = result.union(clip)

# Add mounting hole
${mountType === 'screw' ? `
result = (result
    .faces("<Z")
    .workplane()
    .circle(2)
    .cutThruAll())
` : ''}

show_object(result)
`
    }
}