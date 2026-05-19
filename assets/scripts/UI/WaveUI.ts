import { _decorator, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WaveUI')
export class WaveUI extends Component {
    @property(Label)
    waveLabel: Label = null // 波次文本

    @property(Label)
    waveStatusLavel: Label = null // 状态文本（战斗中/准备中)

    @property(Node)
    breakPanel: Node = null // 波次间隔面板
    start() {

    }

    update(deltaTime: number) {
        
    }
}


