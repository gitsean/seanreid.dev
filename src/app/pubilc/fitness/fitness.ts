import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { FitnessSnapshot, WeekData, buildWeeklyData } from './fitness-data';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const ALL = '__all__';

@Component({
  selector: 'app-fitness',
  imports: [DatePipe, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './fitness.html',
  styleUrl: './fitness.scss',
})
export class Fitness {
  protected readonly ALL = ALL;
  protected readonly snapshot = httpResource<FitnessSnapshot>(() => 'fitness.json');

  /** Selected sport types; empty means "All". */
  private readonly selected = signal<ReadonlySet<string>>(new Set());

  protected readonly sports = computed(() => {
    const activities = this.snapshot.value()?.activities ?? [];
    return [...new Set(activities.map((a) => a.sport_type))].sort();
  });

  protected readonly chipValue = computed(() =>
    this.selected().size === 0 ? [ALL] : [...this.selected()],
  );

  protected readonly weeks = computed(() =>
    buildWeeklyData(this.snapshot.value()?.activities ?? [], this.selected()),
  );

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'bar' | 'line', number[], string>;

  constructor() {
    effect(() => {
      const canvas = this.canvas();
      const weeks = this.weeks();
      if (!canvas) {
        this.destroyChart();
        return;
      }
      if (this.chart?.canvas === canvas.nativeElement) {
        this.updateChart(weeks);
      } else {
        this.destroyChart();
        this.chart = this.createChart(canvas.nativeElement, weeks);
      }
    });
    inject(DestroyRef).onDestroy(() => this.destroyChart());
  }

  protected onSelectionChange(values: string[]): void {
    const wasAll = this.selected().size === 0;
    if (!wasAll && values.includes(ALL)) {
      this.selected.set(new Set());
    } else {
      // Always a new Set so the chip binding re-syncs even if "All" was clicked while active
      this.selected.set(new Set(values.filter((v) => v !== ALL)));
    }
  }

  private createChart(canvas: HTMLCanvasElement, weeks: WeekData[]) {
    // M3 tokens are light-dark() expressions canvas can't parse; let the
    // browser resolve each one to an rgb() value via a probe element.
    const probe = canvas.parentElement!.appendChild(document.createElement('span'));
    const color = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const axis = color('--mat-sys-on-surface-variant');
    const grid = color('--mat-sys-outline-variant');
    const primary = color('--mat-sys-primary');
    const tertiary = color('--mat-sys-tertiary');
    probe.remove();
    const hours = (v: string | number) => `${v}h`;

    return new Chart<'bar' | 'line', number[], string>(canvas, {
      data: {
        labels: weeks.map((w) => w.label),
        datasets: [
          {
            type: 'line',
            label: 'Fitness (6wk avg)',
            data: weeks.map((w) => w.fitness),
            yAxisID: 'fitness',
            borderColor: tertiary,
            backgroundColor: tertiary,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
          },
          {
            type: 'bar',
            label: 'Weekly Volume',
            data: weeks.map((w) => w.volume),
            yAxisID: 'volume',
            backgroundColor: primary,
            borderRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: axis, maxTicksLimit: 10, maxRotation: 0 },
          },
          volume: {
            position: 'left',
            beginAtZero: true,
            grid: { color: grid },
            ticks: { color: axis, callback: hours },
          },
          fitness: {
            position: 'right',
            beginAtZero: true,
            grid: { display: false },
            ticks: { color: axis, callback: hours },
          },
        },
        plugins: {
          legend: { labels: { color: axis } },
          tooltip: {
            callbacks: {
              title: (items) => `Week of ${this.formatWeek(this.weeks()[items[0].dataIndex].week)}`,
              label: (item) => `${item.dataset.label}: ${item.formattedValue}h`,
            },
          },
        },
      },
    });
  }

  private updateChart(weeks: WeekData[]): void {
    if (!this.chart) return;
    this.chart.data.labels = weeks.map((w) => w.label);
    this.chart.data.datasets[0].data = weeks.map((w) => w.fitness);
    this.chart.data.datasets[1].data = weeks.map((w) => w.volume);
    this.chart.update();
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private formatWeek(iso: string): string {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
}
