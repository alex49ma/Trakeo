// Password hashing for Better Auth (D16 in ../SDD/better-auth-migration/). New passwords use Better Auth's own
// scrypt hash. Users imported from Clerk keep their bcrypt hash until they change their password, so verify accepts both
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "better-auth/crypto";

const BCRYPT_HASH = /^\$2[aby]\$/;

export function hash(password) {
    return hashPassword(password);
}

export function verify({ hash, password }) {
    if (BCRYPT_HASH.test(hash)) return bcrypt.compare(password, hash);
    return verifyPassword({ hash, password });
}
