import { TestBed } from '@angular/core/testing';
import { Experiments } from './experiments';

describe('Experiments', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [Experiments] }).compileComponents();
    const fixture = TestBed.createComponent(Experiments);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
