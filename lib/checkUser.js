import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/prisma"
import { SYSTEM_CATEGORIES } from "@/lib/system-categories"

export const checkUser = async () => {
    let user;
    try {
        user = await currentUser();
    } catch (e) {
        console.error("CheckUser: Error fetching user (likely middleware missing):", e);
        return null;
    }

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
                // The two defaults plus the three transfer categories, all locked
                categories: {
                    create: SYSTEM_CATEGORIES
                }
            }
        })

        return newUser

    } catch (error) {
        console.error("Error checking user:", error)
    }

}