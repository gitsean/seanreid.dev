import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Experiments } from './experiments';

describe('Experiments', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [Experiments],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Experiments);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
