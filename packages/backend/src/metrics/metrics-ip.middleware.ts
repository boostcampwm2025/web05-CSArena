import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import * as net from 'net';

@Injectable()
export class MetricsIpMiddleware implements NestMiddleware {
  private readonly allowedCidrs: { ip: number; mask: number }[];

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('PROMETHEUS_ALLOWED_CIDRS');
    this.allowedCidrs = raw
      ? raw
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((cidr) => this.parseCidr(cidr))
      : [];
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? '';
    const ipv4 = this.extractIpv4(clientIp);

    if (!ipv4 || !net.isIPv4(ipv4) || !this.isAllowed(ipv4)) {
      throw new ForbiddenException();
    }

    next();
  }

  private extractIpv4(ip: string): string | null {
    if (net.isIPv4(ip)) {
      return ip;
    }

    // ::ffff:x.x.x.x (IPv4-mapped IPv6)
    const prefix = '::ffff:';

    if (ip.startsWith(prefix)) {
      const v4 = ip.slice(prefix.length);

      if (net.isIPv4(v4)) {
        return v4;
      }
    }

    return null;
  }

  private parseCidr(cidr: string): { ip: number; mask: number } {
    const [ipStr, bitsStr] = cidr.split('/');
    const bits = bitsStr !== undefined ? parseInt(bitsStr, 10) : 32;

    return {
      ip: this.ipToInt(ipStr),
      mask: bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0,
    };
  }

  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
  }

  private isAllowed(ip: string): boolean {
    if (this.allowedCidrs.length === 0) {
      return false;
    }

    const ipInt = this.ipToInt(ip);

    return this.allowedCidrs.some(({ ip: netIp, mask }) => (ipInt & mask) === (netIp & mask));
  }
}
