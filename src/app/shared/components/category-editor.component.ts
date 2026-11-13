import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonText } from '@ionic/angular/ion-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';

import { CATEGORY_COLORS, Category } from '../../domain/category';
import { TodoStore } from '../../application/todo.store';

export interface CategoryEditorResult {
  name: string;
  color: string;
}

/** Modal para crear o editar una categoría (nombre + color). */
@Component({
  selector: 'app-category-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonText,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './category-editor.component.html',
  styleUrl: './category-editor.component.scss',
})
export class CategoryEditorComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly store = inject(TodoStore);

  readonly category = input<Category | null>(null);

  protected readonly colors = [...CATEGORY_COLORS];
  protected readonly name = signal('');
  protected readonly color = signal(CATEGORY_COLORS[0]);

  protected readonly error = computed(() =>
    this.name().trim() && this.store.categoryNameExists(this.name(), this.category()?.id)
      ? 'Ya existe una categoría con ese nombre.'
      : null,
  );

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.name.set(category.name);
      this.color.set(category.color);
    } else {
      this.color.set(this.store.nextCategoryColor());
    }
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    const name = this.name().trim();
    if (!name || this.error()) return;
    const result: CategoryEditorResult = { name, color: this.color() };
    void this.modalCtrl.dismiss(result, 'save');
  }
}
