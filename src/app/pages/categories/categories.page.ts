import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonFab } from '@ionic/angular/ion-fab';
import { IonFabButton } from '@ionic/angular/ion-fab-button';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonItemOption } from '@ionic/angular/ion-item-option';
import { IonItemOptions } from '@ionic/angular/ion-item-options';
import { IonItemSliding } from '@ionic/angular/ion-item-sliding';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonNote } from '@ionic/angular/ion-note';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import { addIcons } from 'ionicons';
import { add, createOutline, funnelOutline, pricetagsOutline, trashOutline } from 'ionicons/icons';

import { Category } from '../../core/models/todo.models';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { TodoStore } from '../../core/services/todo.store';
import {
  CategoryEditorComponent,
  CategoryEditorResult,
} from '../../shared/components/category-editor.component';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './categories.page.html',
  styleUrl: './categories.page.scss',
})
export class CategoriesPage {
  protected readonly store = inject(TodoStore);
  private readonly flags = inject(FeatureFlagsService);
  private readonly modals = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);

  constructor() {
    addIcons({ add, createOutline, funnelOutline, pricetagsOutline, trashOutline });
    // Si Remote Config apaga la funcionalidad mientras estamos aquí, volver a la lista.
    effect(() => {
      if (!this.flags.categoriesEnabled())
        void this.router.navigateByUrl('/tasks', { replaceUrl: true });
    });
  }

  protected taskCount(id: string): number {
    return this.store.counts().byCategory.get(id) ?? 0;
  }

  protected async create(): Promise<void> {
    const result = await this.openEditor(null);
    if (result) this.store.addCategory(result.name, result.color);
  }

  protected async edit(category: Category): Promise<void> {
    const result = await this.openEditor(category);
    if (result) this.store.updateCategory(category.id, result);
  }

  protected async remove(category: Category): Promise<void> {
    const count = this.taskCount(category.id);
    const alert = await this.alerts.create({
      header: `Eliminar «${category.name}»`,
      message: count
        ? `Sus ${count} tarea(s) no se borrarán: quedarán sin categoría.`
        : 'Esta categoría no tiene tareas.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.store.removeCategory(category.id),
        },
      ],
    });
    await alert.present();
  }

  protected showTasks(category: Category): void {
    this.store.categoryFilter.set(category.id);
    void this.router.navigateByUrl('/tasks');
  }

  private async openEditor(category: Category | null): Promise<CategoryEditorResult | undefined> {
    const modal = await this.modals.create({
      component: CategoryEditorComponent,
      componentProps: { category },
      breakpoints: [0, 0.6, 1],
      initialBreakpoint: 0.6,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<CategoryEditorResult>();
    return role === 'save' ? data : undefined;
  }
}
