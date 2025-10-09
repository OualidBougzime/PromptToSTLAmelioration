export class RoboticsPatternGenerator {
    static pneumaticActuator(params: any): string {
        const {
            bodyLength = 60,
            bodyWidth = 15,
            bodyHeight = 10,
            chamberCount = 6
        } = params

        return `import cadquery as cq

body_length = ${bodyLength}
body_width = ${bodyWidth}
body_height = ${bodyHeight}
chamber_count = ${chamberCount}

body = cq.Workplane("XY").box(body_length, body_width, body_height)

chamber_spacing = body_length / chamber_count
for i in range(chamber_count):
    x_pos = (i * chamber_spacing) - (body_length / 2) + chamber_spacing / 2
    chamber = cq.Workplane("XY").workplane(offset=1).center(x_pos, 0).box(8, 8, body_height - 2)
    body = body.cut(chamber)

result = body.edges("|Z").fillet(0.5)
show_object(result)
`
    }
}