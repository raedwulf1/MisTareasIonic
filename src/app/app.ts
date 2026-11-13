import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp } from '@ionic/angular/ion-app';
import { IonBadge } from '@ionic/angular/ion-badge';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonMenu } from '@ionic/angular/ion-menu';
import { IonMenuToggle } from '@ionic/angular/ion-menu-toggle';
import { IonNote } from '@ionic/angular/ion-note';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, pricetagsOutline, settingsOutline } from 'ionicons/icons';

import { FeatureFlagsService } from './application/feature-flags.service';
import { TodoStore } from './application/todo.store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonBadge,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonRouterOutlet,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(TodoStore);
  protected readonly flags = inject(FeatureFlagsService);

  constructor() {
    addIcons({ checkmarkDoneOutline, pricetagsOutline, settingsOutline });
    // Remote Config se consulta después del primer render para no retrasar la carga inicial.
    afterNextRender(() => void this.flags.init());
  }
}
