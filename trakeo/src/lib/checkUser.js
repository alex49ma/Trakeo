import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/prisma"

export const checkUser = async () => {
    const user = await currentUser()

    if (!user) {
        return null
    }

    try {
        const loggedUser = await db.user.findUnique({
            where: {
                clerkUserId: user.id
            }
        })

        if (loggedUser) {
            return loggedUser
        }

        const name = user.firstName + " " + user.lastName
        const newUser = await db.user.create({
            data: {
                clerkUserId: user.id,
                name,
                imageUrl: user.imageUrl,
                email: user.emailAddresses[0].emailAddress,
                categories: {
                    create: [
                        { name: "Other Expenses", type: "EXPENSE", color: "#94a3b8" },
                        { name: "Other Income", type: "INCOME", color: "#64748b" },
                    ]
                }
            }
        })

        return newUser

    } catch (error) {
        console.error("Error checking user:", error)
    }

}