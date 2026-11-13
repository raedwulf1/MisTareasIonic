import { ScrollingModule } from '@angular/cdk/scrolling';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { IonBadge } from '@ionic/angular/ion-badge';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonChip } from '@ionic/angular/ion-chip';
import { IonContent } from '@ionic/angular/ion-content';
import { IonFabButton } from '@ionic/angular/ion-fab-button';
import { IonFooter } from '@ionic/angular/ion-footer';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonProgressBar } from '@ionic/angular/ion-progress-bar';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import { ToastController } from '@ionic/angular/toast-controller';
import { addIcons } from 'ionicons';
import { add, addCircle, checkmarkDoneCircleOutline, sparklesOutline } from 'ionicons/icons';

import { FeatureFlagsService } from '../../application/feature-flags.service';
import { TodoStore } from '../../application/todo.store';
import { Task } from '../../domain/task';
import { CategoryFilter, StatusFilter } from '../../domain/task-query';
import { TASK_ITEM_HEIGHT, TaskItemComponent } from '../../shared/components/task-item.component';
import {
  TaskEditorComponent,
  TaskEditorResult,
} from '../../shared/components/task-editor.component';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    ScrollingModule,
    TaskItemComponent,
    IonBadge,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonFabButton,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonMenuButton,
    IonProgressBar,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss',
})
export class TasksPage {
  protected readonly store = inject(TodoStore);
  protected readonly flags = inject(FeatureFlagsService);
  private readonly modals = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly itemHeight = TASK_ITEM_HEIGHT;

  protected readonly newTitle = signal('');
  /** Categoría para la próxima tarea; por defecto, la del filtro activo. */
  protected readonly newCategoryId = signal<string | null>(null);

  protected readonly progress = computed(() => {
    const { all, completed } = this.store.counts();
    return all ? completed / all : 0;
  });

  protected readonly emptyMessage = computed(() => {
    if (this.store.counts().all === 0) return 'Aún no tienes tareas. ¡Agrega la primera!';
    if (this.store.search()) return 'Ninguna tarea coincide con la búsqueda.';
    return 'No hay tareas con este filtro.';
  });

  constructor() {
    addIcons({ add, addCircle, checkmarkDoneCircleOutline, sparklesOutline });
  }

  protected setCategoryFilter(filter: CategoryFilter): void {
    this.store.categoryFilter.set(filter);
    this.newCategoryId.set(filter === 'all' || filter === 'none' ? null : filter);
  }

  protected setStatusFilter(value: unknown): void {
    this.store.statusFilter.set((value as StatusFilter) ?? 'all');
  }

  protected addTask(): void {
    if (this.store.addTask(this.newTitle(), this.newCategoryId())) this.newTitle.set('');
  }

  protected async removeTask(id: string): Promise<void> {
    const removed = this.store.removeTask(id);
    if (!removed) return;
    const toast = await this.toasts.create({
      message: `Tarea eliminada: «${removed.title}»`,
      duration: 3500,
      position: 'bottom',
      positionAnchor: 'tasks-footer',
      buttons: [
        { text: 'Deshacer', role: 'cancel', handler: () => this.store.restoreTask(removed) },
      ],
    });
    await toast.present();
  }

  protected async editTask(task: Task): Promise<void> {
    const modal = await this.modals.create({
      component: TaskEditorComponent,
      componentProps: {
        task,
        categories: this.store.categories(),
        showCategories: this.flags.categoriesEnabled(),
      },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<TaskEditorResult>();
    if (role === 'save' && data) this.store.updateTask(task.id, data);
  }

  protected async clearCompleted(): Promise<void> {
    const { completed } = this.store.counts();
    if (!completed) return;
    const alert = await this.alerts.create({
      header: 'Eliminar completadas',
      message: `Se eliminarán ${completed} tarea(s) completada(s).`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => void this.store.clearCompleted() },
      ],
    });
    await alert.present();
  }

  protected trackById(_: number, task: Task): string {
    return task.id;
  }
}
