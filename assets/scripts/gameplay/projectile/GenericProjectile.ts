// assets/scripts/gameplay/projectile/GenericProjectile.ts

import { _decorator, Node, Vec3, Sprite, Color, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { ObjectPool } from '../../utils/ObjectPool';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';

const { ccclass, property } = _decorator;

const ELEMENT_COLORS: Record<string, Color> = {
    fire: new Color(255, 87, 34, 255),
    water: new Color(33, 150, 243, 255),
    wood: new Color(76, 175, 80, 255),
    metal: new Color(255, 193, 7, 255),
    earth: new Color(121, 85, 72, 255),
    thunder: new Color(156, 39, 176, 255),
    chaos: new Color(255, 0, 255, 255)
};

@ccclass('GenericProjectile')
export class GenericProjectile extends BaseComponent {
    @property
    speed: number = 400;

    private damage: number = 0;
    private element: string = '';
    private skillId: string = '';
    private direction: Vec3 = new Vec3(1, 0, 0);
    private pierce: boolean = false;
    private pierceRemaining: number = 0;
    private burnPercent: number = 0;
    private freezeDuration: number = 0;
    private poisonPercent: number = 0;
    private isFromPool: boolean = false;
    private poolKey: string = 'genericProjectile';
    private canvasNode: Node = null;
    private isRecycling: boolean = false;

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        this.canvasNode = this.getService<Node>('canvasNode');
        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this);
    }

    protected onDestroy() {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this);
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool;
    }

    public init(damage: number, element: string, skillId: string,
        direction: { x: number, y: number }, speed: number,
        pierce: boolean, burnPercent: number,
        freezeDuration: number, poisonPercent: number) {

        this.damage = damage;
        this.element = element;
        this.skillId = skillId;
        this.direction = new Vec3(direction.x, direction.y, 0).normalize();
        this.speed = speed;
        this.pierce = pierce;
        this.pierceRemaining = pierce ? 1 : 0;
        this.burnPercent = burnPercent;
        this.freezeDuration = freezeDuration;
        this.poisonPercent = poisonPercent;

        this.applyElementStyle();
        this.isRecycling = false;
    }

    private applyElementStyle() {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        const color = ELEMENT_COLORS[this.element] || Color.WHITE;
        sprite.color = color;
    }

    private onPause(pause: boolean) {
        // 暂停处理
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemy = otherCollider.node.getComponent(Enemy);
        if (!enemy || enemy.isDead) return;

        const hitPos = enemy.node.worldPosition.clone();
        enemy.takeDamage(this.damage);

        // 吸血回调
        const canvas = this.canvasNode;
        const playerNode = canvas?.getChildByName('Player');
        const playerController = playerNode?.getComponent('PlayerController') as any;
        if (playerController) {
            playerController.onAttackHit(this.damage, null);
        }

        // 穿透逻辑
        if (this.pierceRemaining > 0) {
            this.pierceRemaining--;
            return;
        }

        this.recycleToPool();
    }

    private recycleToPool() {
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance();
            pool.recycle(this.poolKey, this.node);
        } else {
            this.node.destroy();
        }
    }

    public reset() {
        this.damage = 0;
        this.element = '';
        this.skillId = '';
        this.direction = new Vec3(1, 0, 0);
        this.speed = 400;
        this.pierce = false;
        this.pierceRemaining = 0;
        this.burnPercent = 0;
        this.freezeDuration = 0;
        this.poisonPercent = 0;
        this.isRecycling = false;

        const sprite = this.getComponent(Sprite);
        if (sprite) {
            sprite.color = Color.WHITE;
        }
    }

    update(deltaTime: number) {
        const newPos = this.node.position.clone();
        newPos.x += this.direction.x * this.speed * deltaTime;
        newPos.y += this.direction.y * this.speed * deltaTime;
        this.node.setPosition(newPos);

        // 超出边界回收
        const pos = this.node.position;
        const bound = 2000;
        if (Math.abs(pos.x) > bound || Math.abs(pos.y) > bound) {
            this.recycleToPool();
        }
    }
}