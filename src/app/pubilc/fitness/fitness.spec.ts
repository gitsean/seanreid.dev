import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Fitness } from './fitness';

describe('Fitness', () => {
  it('shows the empty state when there are no activities', async () => {
    await TestBed.configureTestingModule({
      imports: [Fitness],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Fitness);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('fitness.json')
      .flush({ generated_at: '2026-09-23T00:00:00Z', activities: [] });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No activities yet.');
  });
});
