import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { LoginResult, RegisterData } from "src/app/interfaces/interfaces";
import { MaterialModule } from "src/app/modules/material/material.module";
import { Utils } from "src/app/modules/shared/utils.class";
import { ApiService } from "src/app/services/api.service";
import { UserService } from "src/app/services/user.service";

@Component({
  standalone: true,
  selector: "gst-register",
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.scss"],
  imports: [CommonModule, MaterialModule, FormsModule],
})
export default class RegisterComponent {
  registerData: RegisterData = {
    email: "",
    name: "",
    pass: "",
    conf: "",
  };
  registerEmailError: boolean = false;
  registerPassError: boolean = false;
  registerSending: boolean = false;

  constructor(
    private as: ApiService,
    private user: UserService,
    private router: Router
  ) {}

  doRegister(ev: Event): void {
    ev.preventDefault();

    if (
      this.registerData.email === "" ||
      this.registerData.pass === "" ||
      this.registerData.conf === ""
    ) {
      return;
    }

    this.registerEmailError = false;
    this.registerPassError = false;
    if (this.registerData.pass !== this.registerData.conf) {
      this.registerPassError = true;
      return;
    }

    this.registerSending = true;
    this.as
      .register(this.registerData)
      .subscribe((result: LoginResult): void => {
        this.registerSending = false;
        if (result.status === "ok") {
          this.user.logged = true;
          this.user.id = result.id;
          this.user.name = Utils.urldecode(result.name);
          this.user.token = Utils.urldecode(result.token);
          this.user.saveLogin();

          this.router.navigate(["/main"]);
        } else {
          this.registerEmailError = true;
        }
      });
  }
}
