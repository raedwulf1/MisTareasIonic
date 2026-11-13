import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Category, Task } from '../../core/models/todo.models';
import { TaskItemComponent } from './task-item.component';

const TASK: Task = {
  id: 't1',
  title: 'Comprar pan',
  completed: false,
  categoryId: 'compras',
  createdAt: 1,
};
const CATEGORY: Category = { id: 'compras', name: 'Compras', color: '#ffc409' };

describe('TaskItemComponent', () => {
  let fixture: ComponentFixture<TaskItemComponent>;
  let el: HTMLElement;

  function render(inputs: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(TaskItemComponent);
    fixture.componentRef.setInput('task', TASK);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  it('muestra el título de la tarea', () => {
    render();
    expect(el.querySelector('.task-item__title')?.textContent).toContain('Comprar pan');
  });

  it('muestra el nombre y el color de la categoría', () => {
    render({ category: CATEGORY });
    expect(el.querySelector('.task-item__category')?.textContent).toContain('Compras');
    expect((el.querySelector('.task-item__dot') as HTMLElement).style.background).not.toBe('');
  });

  it('muestra "Sin categoría" cuando no hay categoría', () => {
    render();
    expect(el.querySelector('.task-item__category--muted')?.textContent).toContain('Sin categoría');
  });

  it('oculta la categoría cuando showCategory es false', () => {
    render({ category: CATEGORY, showCategory: false });
    expect(el.querySelector('.task-item__category')).toBeNull();
  });

  it('marca la fila como hecha y el checkbox como marcado si está completada', () => {
    render({ task: { ...TASK, completed: true } });
    expect(el.querySelector('ion-item')?.classList).toContain('task-item__item--done');
    expect(el.querySelector('ion-checkbox')?.getAttribute('aria-label')).toBe(
      'Marcar como pendiente',
    );
  });

  it('el checkbox de una tarea pendiente ofrece marcarla como completada', () => {
    render();
    expect(el.querySelector('ion-checkbox')?.getAttribute('aria-label')).toBe(
      'Marcar como completada',
    );
  });

  it('emite toggle con el id al cambiar el checkbox', () => {
    render();
    const spy = vi.fn();
    fixture.componentInstance.toggle.subscribe(spy);
    el.querySelector('ion-checkbox')!.dispatchEvent(new CustomEvent('ionChange'));
    expect(spy).toHaveBeenCalledWith('t1');
  });

  it('emite edit con la tarea al tocar el título', () => {
    render();
    const spy = vi.fn();
    fixture.componentInstance.edit.subscribe(spy);
    (el.querySelector('ion-label') as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith(TASK);
  });

  it('emite remove con el id al pulsar el botón de eliminar', () => {
    render();
    const spy = vi.fn();
    fixture.componentInstance.remove.subscribe(spy);
    const sliding = el.querySelector('ion-item-sliding') as HTMLElement & { close: () => void };
    sliding.close = vi.fn();
    (el.querySelector('ion-item-option') as HTMLElement).click();
    expect(sliding.close).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('t1');
  });

  it('emite remove al hacer swipe completo', () => {
    render();
    const spy = vi.fn();
    fixture.componentInstance.remove.subscribe(spy);
    el.querySelector('ion-item-options')!.dispatchEvent(new CustomEvent('ionSwipe'));
    expect(spy).toHaveBeenCalledWith('t1');
  });
});
