import { TestBed } from '@angular/core/testing';
import { Experience } from './experience';

describe('Experience', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [Experience] }).compileComponents();
    const fixture = TestBed.createComponent(Experience);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
