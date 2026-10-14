package up.fe.les.travelplanner.user

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import up.fe.les.travelplanner.user.dto.CreateUserRequest
import up.fe.les.travelplanner.user.dto.UpdateUserRequest
import up.fe.les.travelplanner.user.dto.UserResponse
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository
) {

    fun create(request: CreateUserRequest): UserResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "A user with this email already exists"
            )
        }

        val user = User(
            username = request.name,
            email = request.email
        )

        val savedUser = userRepository.save(user)

        return savedUser.toResponse()
    }

    fun findAll(): List<UserResponse> =
        userRepository.findAll().map { it.toResponse() }

    fun findById(id: UUID): UserResponse =
        userRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User not found"
                )
            }
            .toResponse()

    private fun User.toResponse() = UserResponse(
        id = requireNotNull(id),
        name = username,
        email = email,
        createdAt = createdDate
    )


    fun delete(id: UUID) {
        val user = userRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User not found"
                )
            }
        userRepository.delete(user)
    }


    fun update(id: UUID, request: UpdateUserRequest): UserResponse {
        val user = userRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User not found"
                )
            }

        if (user.email != request.email &&
            userRepository.existsByEmail(request.email)
        ) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "A user with this email already exists"
            )
        }

        user.username = request.name
        user.email = request.email

        val updatedUser = userRepository.save(user)

        return updatedUser.toResponse()
    }


}
