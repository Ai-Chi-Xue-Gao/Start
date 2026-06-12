// assets/scripts/gameplay/projectile/GenericProjectile.ts

import { _decorator, Node, Vec3, Sprite, Color, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { ObjectPool } from '../../utils/ObjectPool';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { ProjectileConfig } from '../../configs/GameConfig';
import { ServiceLocator } from '../../core/ServiceLocator';
import { IPlayer } from '../../interfaces/IPlayer';

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

const DEFAULT_COLOR = Color.WHITE;

@ccclass('GenericProjectile')
export class GenericProjectile extends BaseComponent {
    @property
    speed: number = ProjectileConfig.DEFAULT_SPEED;

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
    private canvasNode: Node | null = null;
    private isRecycling: boolean = false;
    
    // 防止重复命中
    private hasHit: boolean = false;
    private hitEnemies: Set<Enemy> = new Set();

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

    public setFromPool(fromPool: boolean): void {
        this.isFromPool = fromPool;
    }

    public init(damage: number, element: string, skillId: string,
        direction: { x: number, y: number }, speed: number,
        pierce: boolean, burnPercent: number,
        freezeDuration: number, poisonPercent: number): void {

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

        // 重置状态
        this.hasHit = false;
        this.isRecycling = false;
        this.hitEnemies.clear();

        this.applyElementStyle();
    }

    private applyElementStyle(): void {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        const color = ELEMENT_COLORS[this.element] ?? DEFAULT_COLOR;
        sprite.color = color;
    }

    private onPause(pause: boolean): void {}

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact): void {
        // 防止重复处理（一个火球只应该命中一次）
        if (this.hasHit) {
            return;
        }
        
        const enemy = otherCollider.node.getComponent(Enemy);
        if (!enemy || enemy.isDead) {
            return;
        }
        
        // 防止重复命中同一敌人
        if (this.hitEnemies.has(enemy)) {
            return;
        }
        
        // 立即标记，防止后续重复调用
        this.hasHit = true;
        this.hitEnemies.add(enemy);
        
        // 造成伤害
        enemy.takeDamage(this.damage);
        
        // 触发攻击命中回调（吸血等效果）
        const player = ServiceLocator.getInstance().get<IPlayer>('player');
        if (player) {
            player.onAttackHit(this.damage, null);
        }
        
        // 穿透逻辑
        if (this.pierceRemaining > 0) {
            this.pierceRemaining--;
            this.hasHit = false;  // 穿透后重置标记，可以继续命中下一个敌人
            return;
        }
        
        // 回收火球
        this.recycleToPool();
    }

    private recycleToPool(): void {
        if (this.isRecycling) return;
        this.isRecycling = true;

        if (this.isFromPool) {
            const pool = ObjectPool.getInstance();
            pool.recycle(this.poolKey, this.node);
        } else {
            this.node.destroy();
        }
    }

    public reset(): void {
        this.damage = 0;
        this.element = '';
        this.skillId = '';
        this.direction = new Vec3(1, 0, 0);
        this.speed = ProjectileConfig.DEFAULT_SPEED;
        this.pierce = false;
        this.pierceRemaining = 0;
        this.burnPercent = 0;
        this.freezeDuration = 0;
        this.poisonPercent = 0;
        this.isRecycling = false;
        this.hasHit = false;
        this.hitEnemies.clear();

        const sprite = this.getComponent(Sprite);
        if (sprite) {
            sprite.color = DEFAULT_COLOR;
        }
    }

    private isOutOfBounds(pos: Vec3): boolean {
        const bound = ProjectileConfig.BOUND_THRESHOLD;
        return Math.abs(pos.x) > bound || Math.abs(pos.y) > bound;
    }

    update(deltaTime: number): void {
        // 如果已经命中并且没有穿透，不再更新位置
        if (this.hasHit && this.pierceRemaining <= 0) {
            return;
        }
        
        const newPos = this.node.position.clone();
        newPos.x += this.direction.x * this.speed * deltaTime;
        newPos.y += this.direction.y * this.speed * deltaTime;
        this.node.setPosition(newPos);

        if (this.isOutOfBounds(this.node.position)) {
            if (!this.hasHit) {
                this.hasHit = true;
            }
            this.recycleToPool();
        }
    }
}