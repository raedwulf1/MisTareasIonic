import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonItem } from '@ionic/angular/ion-item';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonRadio } from '@ionic/angular/ion-radio';
import { IonRadioGroup } from '@ionic/angular/ion-radio-group';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';

import { Category, Task } from '../../core/models/todo.models';

export interface TaskEditorResult {
  title: string;
  categoryId: string | null;
}

/** Modal para editar el título y la categoría de una tarea. */
@Component({
  selector: 'app-task-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonList,
    IonListHeader,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './task-editor.component.html',
  styleUrl: './task-editor.component.scss',
})
export class TaskEditorComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  /** Valores que recibe el modal vía `componentProps`. */
  readonly task = input.required<Task>();
  readonly categories = input<readonly Category[]>([]);
  readonly showCategories = input(true);

  protected readonly title = signal('');
  protected readonly categoryId = signal<string | null>(null);

  ngOnInit(): void {
    this.title.set(this.task().title);
    this.categoryId.set(this.task().categoryId);
  }

  selectCategory(value: string): void {
    this.categoryId.set(value === 'none' ? null : value);
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    const title = this.title().trim();
    if (!title) return;
    const result: TaskEditorResult = { title, categoryId: this.categoryId() };
    void this.modalCtrl.dismiss(result, 'save');
  }
}
