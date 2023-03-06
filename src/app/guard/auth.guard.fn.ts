import { inject } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from "@angular/router";
import { AuthService } from "src/app/services/auth.service";

export function isLoggedGuardFn(): CanActivateFn {
  return (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const isLoggedIn: boolean = authService.isAuthenticated();
    if (!isLoggedIn) {
      router.navigate(["/"]);
    }
    return isLoggedIn;
  };
}
