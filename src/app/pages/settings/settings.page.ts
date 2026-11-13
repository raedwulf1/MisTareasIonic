import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular/alert-controller';
import { IonBadge } from '@ionic/angular/ion-badge';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonNote } from '@ionic/angular/ion-note';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ToastController } from '@ionic/angular/toast-controller';

import { FeatureFlagsService } from '../../application/feature-flags.service';
import { FlagSource } from '../../domain/feature-flags';
import { TodoStore } from '../../application/todo.store';

const SOURCE_LABELS: Record<FlagSource, string> = {
  remote: 'Firebase Remote Config',
  default: 'Valor por defecto',
  override: 'Forzado localmente',
};

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenuButton,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  protected readonly flags = inject(FeatureFlagsService);
  protected readonly store = inject(TodoStore);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly lastGeneration = signal<number | null>(null);

  protected readonly statusLabel = computed(() => {
    switch (this.flags.status()) {
      case 'unavailable':
        return 'No disponible en el navegador: se usan valores por defecto.';
      case 'loading':
        return 'Descargando configuración…';
      case 'ready':
        return 'Conectado a Firebase.';
      case 'error':
        return `Sin conexión con Firebase (${this.flags.lastError() ?? 'error'}). Se usan los últimos valores conocidos.`;
      default:
        return 'Inicializando…';
    }
  });

  protected readonly sourceLabel = computed(
    () => SOURCE_LABELS[this.flags.source('categories_enabled')],
  );

  protected readonly overrideValue = computed(() => {
    if (this.flags.source('categories_enabled') !== 'override') return 'remote';
    return this.flags.categoriesEnabled() ? 'on' : 'off';
  });

  protected setOverride(value: unknown): void {
    this.flags.setOverride(
      'categories_enabled',
      value === 'on' ? true : value === 'off' ? false : null,
    );
  }

  protected async generate(amount: number): Promise<void> {
    const start = performance.now();
    this.store.generateDemoTasks(amount);
    this.lastGeneration.set(performance.now() - start);
    const toast = await this.toasts.create({
      message: `Se generaron ${amount.toLocaleString('es')} tareas.`,
      duration: 2000,
    });
    await toast.present();
  }

  protected async removeAll(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Eliminar todas las tareas',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => this.store.removeAllTasks() },
      ],
    });
    await alert.present();
  }
}
