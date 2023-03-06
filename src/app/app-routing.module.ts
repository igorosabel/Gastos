import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { isLoggedGuardFn } from "src/app/guard/auth.guard.fn";
import { LoginComponent } from "src/app/modules/pages/login/login.component";

const routes: Routes = [
  {
    path: "",
    component: LoginComponent,
  },
  {
    path: "register",
    loadComponent: () =>
      import("src/app/modules/pages/register/register.component"),
  },
  {
    path: "main",
    loadComponent: () => import("src/app/modules/pages/main/main.component"),
    canActivate: ["CanActivateFn"],
  },
  { path: "**", redirectTo: "/", pathMatch: "full" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [{ provide: "CanActivateFn", useFactory: isLoggedGuardFn }],
})
export class AppRoutingModule {}
