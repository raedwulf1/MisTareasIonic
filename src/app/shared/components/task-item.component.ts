import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonCheckbox } from '@ionic/angular/ion-checkbox';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonItemOption } from '@ionic/angular/ion-item-option';
import { IonItemOptions } from '@ionic/angular/ion-item-options';
import { IonItemSliding } from '@ionic/angular/ion-item-sliding';
import { IonLabel } from '@ionic/angular/ion-label';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

import { Category } from '../../domain/category';
import { Task } from '../../domain/task';

/** Altura fija de cada fila: el scroll virtual la necesita para calcular qué filas pintar. */
export const TASK_ITEM_HEIGHT = 64;

/**
 * Fila de tarea "tonta": solo recibe datos y emite eventos. Con `OnPush` y entradas
 * inmutables, Angular solo la vuelve a pintar cuando cambia su tarea o su categoría.
 */
@Component({
  selector: 'app-task-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCheckbox, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel],
  templateUrl: './task-item.component.html',
  styleUrl: './task-item.component.scss',
})
export class TaskItemComponent {
  readonly task = input.required<Task>();
  readonly category = input<Category | undefined>();
  readonly showCategory = input(true);

  readonly toggle = output<string>();
  readonly remove = output<string>();
  readonly edit = output<Task>();

  constructor() {
    addIcons({ trashOutline });
  }
}
