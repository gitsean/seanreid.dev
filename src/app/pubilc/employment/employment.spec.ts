import { TestBed } from '@angular/core/testing';
import { Employment } from './employment';

describe('Employment', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [Employment] }).compileComponents();
    const fixture = TestBed.createComponent(Employment);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
