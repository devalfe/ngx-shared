import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxGlobalState } from './ngx-global-state';

describe('NgxGlobalState', () => {
  let component: NgxGlobalState;
  let fixture: ComponentFixture<NgxGlobalState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxGlobalState]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxGlobalState);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
