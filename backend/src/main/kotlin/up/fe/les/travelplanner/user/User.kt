package up.fe.les.travelplanner.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "app_users",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_app_users_email",
            columnNames = ["email"]
        )
    ]
)
class User (

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false, length = 100)
     var username: String = "",

    //    var password: String? = null // TODO should have?

    @Column(nullable = false, length = 100)
     var email: String = "",

    @Column(nullable = false, updatable = false)
     var createdDate: Instant = Instant.now()

//    var updatedDate: LocalDateTime? = null // TODO we need it?

)