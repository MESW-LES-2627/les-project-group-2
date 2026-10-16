package up.fe.les.travelplanner.user

import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import up.fe.les.travelplanner.user.dto.CreateUserRequest
import up.fe.les.travelplanner.user.dto.UpdateUserRequest
import up.fe.les.travelplanner.user.dto.UserResponse
import java.net.URI
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService
) {

    @PostMapping
    fun create(@Valid @RequestBody request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = userService.create(request)

        return ResponseEntity
            .created(URI.create("/api/users/${user.id}"))
            .body(user)
    }

    @GetMapping
    fun findAll(): List<UserResponse> =
        userService.findAll()

    @GetMapping("/{id}")
    fun findById(
        @PathVariable id: UUID
    ): UserResponse =
        userService.findById(id)

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: UUID
    ): ResponseEntity<Void> {
        userService.delete(id)
        return ResponseEntity.noContent().build()
    }


    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateUserRequest
    ): UserResponse =
        userService.update(id, request)


}
