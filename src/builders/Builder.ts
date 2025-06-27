/**
 * 构建器基础接口，定义所有构建器的通用契约
 *
 * @category Builders
 */
export interface Builder<T> {
  /**
   * 构建最终对象
   * @returns 构建完成的对象
   */
  build(): T;
}
