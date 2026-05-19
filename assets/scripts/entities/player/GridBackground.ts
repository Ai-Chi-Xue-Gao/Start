import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GridBackground')
export class GridBackground extends Component {
    @property
    gridSize: number = 100 // 网格间距

    @property
    lineColor: Color = new Color(136, 136, 136, 255) // 灰色网管线条

    @property
    backgroundColor: Color = new Color(30, 30, 45, 255) // 深色背景

    @property
    worldWidth: number = 3000 // 世界宽度

    @property
    worldHeight: number = 2000 // 世界高度

    start() {
        this.drawBackground()
    }

    private drawBackground(){
        const graphics = this.getComponent(Graphics)
        if(!graphics){
            console.error('GridBackground: 需要 Graphics 组件！');
            return
        }

        graphics.clear(); // 清除之前的绘制

        // 1. 先绘制纯色背景
        graphics.fillColor = this.backgroundColor
        graphics.rect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight)
        graphics.fill()

        // 2. 绘制网格线
        graphics.lineWidth = 1
        graphics.strokeColor = this.lineColor

        const halfWidth = this.worldWidth / 2
        const halfHeight = this.worldHeight / 2

        // 绘制垂直线
        for(let x = -halfWidth; x <= halfWidth; x += this.gridSize){
            graphics.moveTo(x, -halfHeight)
            graphics.lineTo(x, halfHeight)
            graphics.stroke()
        }

        // 绘制水平线
        for(let y = -halfHeight; y <= halfHeight; y += this.gridSize){
            graphics.moveTo(-halfWidth, y)
            graphics.lineTo(halfWidth, y)
            graphics.stroke()
        }

        // 3.绘制中心点标记
        graphics.lineWidth = 2
        graphics.strokeColor = new Color(255, 100, 100, 255)
        graphics.circle(0, 0, 20)
        graphics.stroke()
    }

    // 如果需要再运行时修改世界大小，可以调用此方法重新绘制
    public resize(worldWidth: number, worldHeight: number){
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight
        this.drawBackground()
    }

    update(deltaTime: number) {
        
    }
}


