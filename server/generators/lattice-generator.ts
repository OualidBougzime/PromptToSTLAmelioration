export class LatticeGenerator {
    static gyroid(params: any): string {
        const {
            size = 50,
            unitCellSize = 5,
            thickness = 0.8,
            porosity = 0.7
        } = params

        return `import cadquery as cq

size = ${size}
unit_cell = ${unitCellSize}
thickness = ${thickness}

cells = int(size / unit_cell)
result = None

for i in range(cells):
    for j in range(cells):
        for k in range(cells):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            phase = (i + j + k) % 3
            
            if phase == 0:
                strut = cq.Workplane("XY").center(x, y).workplane(offset=z).circle(thickness/2).extrude(unit_cell*1.41)
                result = result.union(strut) if result else strut
            elif phase == 1:
                strut = cq.Workplane("YZ").workplane(offset=x).center(y, z).circle(thickness/2).extrude(unit_cell*1.41)
                result = result.union(strut) if result else strut

bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

show_object(result)
`
    }
}