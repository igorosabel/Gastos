import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { LoginData, LoginResult } from "src/app/interfaces/interfaces";
import { MaterialModule } from "src/app/modules/material/material.module";
import { Utils } from "src/app/modules/shared/utils.class";
import { ApiService } from "src/app/services/api.service";
import { AuthService } from "src/app/services/auth.service";
import { UserService } from "src/app/services/user.service";

@Component({
  standalone: true,
  selector: "gst-login",
  templateUrl: "./login.component.html",
  imports: [CommonModule, MaterialModule, FormsModule],
})
export class LoginComponent implements OnInit {
  loginData = {
    email: "",
    pass: "",
  } as LoginData;
  loginError: boolean = false;
  loginSending: boolean = false;

  constructor(
    private as: ApiService,
    private user: UserService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(["/main"]);
    }
  }

  doLogin(ev: Event): void {
    ev.preventDefault();

    if (this.loginData.email === "" || this.loginData.pass === "") {
      return;
    }

    this.loginSending = true;
    this.as.login(this.loginData).subscribe((result: LoginResult): void => {
      this.loginSending = false;
      if (result.status === "ok") {
        this.user.logged = true;
        this.user.id = result.id;
        this.user.name = Utils.urldecode(result.name);
        this.user.token = Utils.urldecode(result.token);
        this.user.saveLogin();

        this.router.navigate(["/main"]);
      } else {
        this.loginError = true;
      }
    });
  }
}
