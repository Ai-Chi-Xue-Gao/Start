import { _decorator, Color, Sprite } from 'cc';

/**
 * 闪烁效果工具类
 * 提供静态方法，用于给 Sprite 添加闪烁效果
 */
export class FlashEffect{
     /**
     * 执行闪烁效果
     * @param sprite 要闪烁的 Sprite 组件
     * @param duration 持续时间（秒），默认 0.4 秒
     * @param interval 闪烁间隔（秒），默认 0.1 秒
     * @param flashColor 闪烁时的颜色，默认红色
     * @param onComplete 完成后的回调
     * @returns 定时器 ID，可用于提前取消
     */
    public static flash(sprite: Sprite, duration: number = 0.4, interval: number = 0.1,flashColor: Color = Color.RED, onComplete?: () => void): number {
        if(!sprite || !sprite.isValid) return -1

        const originalColor = sprite.color.clone()
        const maxFlashes = Math.floor(duration / interval) * 2
        let flashCount = 0

        const timer = setInterval(() => {
            if(!sprite || !sprite.isValid){
                clearInterval(timer)
                return
            }

            if(flashCount >= maxFlashes){
                clearInterval(timer)
                sprite.color = originalColor
                if(onComplete) onComplete()
                    return
            }

            if(flashCount % 2 === 0){
                sprite.color = flashColor
            } else {
                sprite.color = originalColor
            }
            flashCount++
        }, interval * 1000)

        return timer as unknown as number
    }

    /**
     * 取消闪烁
     * @param timer 定时器 ID
     */
    public static cancel(timer: number | null): void{
        if(timer !== null && timer !== -1){
            clearInterval(timer)
        }
    }
}


