import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt';

import { createCipheriv, randomBytes, scrypt, createDecipheriv } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    async validateUser(username: string, pass: string) {
        const user = await this.usersService.findOne(username);
        if (user) {
            const decipher = createDecipheriv('aes-256-cbc', user.key, user.iv);
            const decryptedText = decipher.update(user.password, 'hex', 'utf8') + decipher.final('utf8');
            if (decryptedText === pass) {
                console.log("password matched")
                const { password, ...result } = user;
                return result;
            }
        }
        return null;
    }

    async login(username: string, password: string) {
        const user = await this.usersService.findOne(username);
        if (user) {
            const payload = { 
                username: user.username, 
                sub: user.id, 
                email: user.email 
            };

            return {
                access_token: this.jwtService.sign(payload, {
                    expiresIn: '24h'
                }),
            };
        }
    }

    async register(username: string, pwd: string, email: string, firstName: string, lastName: string) {
        const key = randomBytes(32);
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-cbc', key, iv);
        const encryptedText = cipher.update(pwd, 'utf8', 'hex') + cipher.final('hex');

        const userInDb = await this.usersService.createUser(
            username,
            encryptedText,
            email,
            firstName,
            lastName,
            key, iv
        );

        const payload = { 
            username: username, 
            sub: userInDb, 
            email: email 
        };

        return {
            access_token: this.jwtService.sign(payload, {
                expiresIn: '24h'
            }),
        };
    }
}
