package up.fe.les.travelplanner.user.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UpdateUserRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,

    @field:NotBlank
    @field:Email
    @field:Size(max = 255)
    val email: String
)