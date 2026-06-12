// assets/scripts/gameplay/managers/AffixStrategyFactory.ts

import { IAffixStrategy } from './affixes/IAffixStrategy';
import { RegenerateAffix } from './affixes/RegenerateAffix';
import { BerserkAffix } from './affixes/BerserkAffix';
import { ImmortalAffix } from './affixes/ImmortalAffix';
import { ExplosiveAffix } from './affixes/ExplosiveAffix';
import { SplitAffix } from './affixes/SplitAffix';
import { TeleportAffix } from './affixes/TeleportAffix';
import { MirrorAffix } from './affixes/MirrorAffix';
import { VampireAffix } from './affixes/VampireAffix';
import { FrostAffix } from './affixes/FrostAffix';
import { MinionMasterAffix } from './affixes/MinionMasterAffix';

/**
 * 词条策略工厂
 * 
 * 每种有特殊行为的词条在此注册一个策略实例，
 * 按 id 快速获取。无特殊行为的词条（如 fast / tough / strong / shield / adaptive）
 * 返回 undefined，由 AffixSystem 仅做属性修改即可。
 */
export class AffixStrategyFactory {
    private static strategies: Map<string, IAffixStrategy> = new Map();
    private static initialized = false;

    static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.strategies.set('regenerate', new RegenerateAffix());
        this.strategies.set('berserk', new BerserkAffix());
        this.strategies.set('immortal', new ImmortalAffix());
        this.strategies.set('explosive', new ExplosiveAffix());
        this.strategies.set('split', new SplitAffix());
        this.strategies.set('teleport', new TeleportAffix());
        this.strategies.set('mirror', new MirrorAffix());
        this.strategies.set('vampire', new VampireAffix());
        this.strategies.set('frost', new FrostAffix());
        this.strategies.set('minion_master', new MinionMasterAffix());
    }

    static get(id: string): IAffixStrategy | undefined {
        return this.strategies.get(id);
    }

    static has(id: string): boolean {
        return this.strategies.has(id);
    }
}