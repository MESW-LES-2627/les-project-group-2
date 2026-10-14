package up.fe.les.travelplanner.user.dto

import java.util.UUID
import java.time.Instant


data class UserResponse(
    val id: UUID,
    val name: String,
    val email: String,
    val createdAt: Instant
)