import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/modal-controller';

import { Category } from '../../domain/category';
import { Task } from '../../domain/task';
import { TaskEditorComponent } from './task-editor.component';

const TASK: Task = {
  id: 't1',
  title: 'Comprar pan',
  completed: false,
  categoryId: 'compras',
  createdAt: 1,
};
const CATEGORIES: Category[] = [
  { id: 'trabajo', name: 'Trabajo', color: '#2dd36f' },
  { id: 'compras', name: 'Compras', color: '#ffc409' },
];

describe('TaskEditorComponent', () => {
  let fixture: ComponentFixture<TaskEditorComponent>;
  let el: HTMLElement;
  const modal = { dismiss: vi.fn() };

  async function render(showCategories = true): Promise<void> {
    fixture = TestBed.createComponent(TaskEditorComponent);
    fixture.componentRef.setInput('task', TASK);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('showCategories', showCategories);
    fixture.detectChanges();
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  function button(text: string): HTMLElement & { disabled: boolean } {
    return Array.from(el.querySelectorAll('ion-button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLElement & { disabled: boolean };
  }

  async function typeTitle(value: string): Promise<void> {
    const input = el.querySelector('ion-input') as HTMLElement & { value: string };
    input.value = value;
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    modal.dismiss.mockClear();
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: modal }] });
  });

  it('muestra el encabezado "Editar tarea"', async () => {
    await render();

    expect(el.querySelector('ion-title')?.textContent).toContain('Editar tarea');
  });

  it('precarga el título de la tarea', async () => {
    await render();

    expect((el.querySelector('ion-input') as HTMLElement & { value: string }).value).toBe(
      'Comprar pan',
    );
  });

  it('lista "Sin categoría" y todas las categorías', async () => {
    await render();

    const labels = Array.from(el.querySelectorAll('ion-radio')).map((r) => r.textContent?.trim());
    expect(labels).toEqual(['Sin categoría', 'Trabajo', 'Compras']);
  });

  it('selecciona la categoría actual de la tarea', async () => {
    await render();

    const group = el.querySelector('ion-radio-group') as HTMLElement & { value: string };
    expect(group.value).toBe('compras');
  });

  it('oculta la lista de categorías cuando showCategories es false', async () => {
    await render(false);

    expect(el.querySelector('ion-radio-group')).toBeNull();
  });

  it('cancelar cierra el modal con rol "cancel"', async () => {
    await render();

    button('Cancelar').click();

    expect(modal.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('guardar devuelve título y categoría con rol "save"', async () => {
    await render();

    button('Guardar').click();

    expect(modal.dismiss).toHaveBeenCalledWith(
      { title: 'Comprar pan', categoryId: 'compras' },
      'save',
    );
  });

  it('cambiar la categoría se refleja en el resultado', async () => {
    await render();
    el.querySelector('ion-radio-group')!.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'trabajo' } }),
    );

    button('Guardar').click();

    expect(modal.dismiss).toHaveBeenCalledWith(
      { title: 'Comprar pan', categoryId: 'trabajo' },
      'save',
    );
  });

  it('elegir "Sin categoría" guarda categoryId null', async () => {
    await render();
    el.querySelector('ion-radio-group')!.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'none' } }),
    );

    button('Guardar').click();

    expect(modal.dismiss).toHaveBeenCalledWith({ title: 'Comprar pan', categoryId: null }, 'save');
  });

  it('recorta el título editado antes de guardar', async () => {
    await render();
    await typeTitle('  Comprar leche  ');

    button('Guardar').click();

    expect(modal.dismiss).toHaveBeenCalledWith(
      { title: 'Comprar leche', categoryId: 'compras' },
      'save',
    );
  });

  it('deshabilita Guardar si el título está vacío', async () => {
    await render();

    await typeTitle('   ');

    expect(button('Guardar').disabled).toBe(true);
  });

  it('no cierra el modal al guardar con el título vacío', async () => {
    await render();
    await typeTitle('   ');

    fixture.componentInstance.save();

    expect(modal.dismiss).not.toHaveBeenCalled();
  });
});
