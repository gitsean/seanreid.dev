import { TestBed } from '@angular/core/testing';
import { Summary } from './summary';

describe('Summary', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [Summary] }).compileComponents();
    const fixture = TestBed.createComponent(Summary);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
