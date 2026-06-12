// assets/scripts/ui/OpenAttributeButton.ts

import { _decorator, Component, Button, Node } from 'cc';
import { AttributePanel, AttributePanelEvents } from './AttributePanel';
import { GameStateMachine } from '../core/GameStateMachine';
import { GameState } from '../core/GameStateMachine';
import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';

const { ccclass } = _decorator;

@ccclass('OpenAttributeButton')
export class OpenAttributeButton extends Component {

    private btn: Button | null = null;
    private attributePanel: AttributePanel | null = null;
    private panelNode: Node | null = null;
    private isOpen: boolean = false;

    start() {
        // 查找 AttributePanel
        this.initPanelReference();

        // 监听面板关闭事件
        EventBus.on(AttributePanelEvents.CLOSE, this.onPanelClose, this);

        this.btn = this.getComponent(Button);
        if (this.btn && this.btn.node) {
            this.btn.node.on(Button.EventType.CLICK, this.onClick, this);
        } else {
            console.warn('[OpenAttributeButton] Button 组件未找到');
        }
    }

    private initPanelReference() {
        const canvas = this.node.parent;
        if (!canvas) return;

        this.attributePanel = canvas.getComponentInChildren(AttributePanel);
        if (this.attributePanel) {
            this.panelNode = this.attributePanel.getPanelNode();
            // 确保面板初始是隐藏的
            if (this.panelNode) {
                this.panelNode.active = false;
                this.isOpen = false;
            }
        } else {
            console.warn('[OpenAttributeButton] 未找到 AttributePanel');
        }
    }

    private onClick() {

        // 检查游戏是否在运行中
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (!stateMachine || stateMachine.getState() !== GameState.RUNNING) {
            return;
        }

        // 如果还没找到面板，重新查找
        if (!this.attributePanel || !this.panelNode) {
            this.initPanelReference();
        }

        if (!this.panelNode) {
            console.warn('[OpenAttributeButton] 无法获取属性面板');
            return;
        }

        // 切换面板显示状态
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    private openPanel() {
        
        // 刷新数据
        if (this.attributePanel) {
            this.attributePanel.refreshData();
        }
        
        // 显示面板
        if (this.panelNode) {
            this.panelNode.active = true;
            this.isOpen = true;
        }
        
        // 暂停游戏
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine) {
            stateMachine.pause();
        }
    }

    private closePanel() {
        
        // 隐藏面板
        if (this.panelNode) {
            this.panelNode.active = false;
            this.isOpen = false;
        }
        
        // 恢复游戏
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine) {
            stateMachine.resume();
        }
    }

    private onPanelClose() {
        
        // 更新状态
        if (this.panelNode) {
            this.panelNode.active = false;
            this.isOpen = false;
        }
        
        // 恢复游戏
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine) {
            stateMachine.resume();
        }
    }

    protected onDestroy() {
        EventBus.off(AttributePanelEvents.CLOSE, this.onPanelClose, this);
        
        if (this.btn && this.btn.node && this.btn.node.isValid) {
            this.btn.node.off(Button.EventType.CLICK, this.onClick, this);
        }
        this.btn = null;
    }
}