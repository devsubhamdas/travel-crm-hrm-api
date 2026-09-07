import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}
  async getTours() {
    return await this.prisma.tours.findMany({
      select: { id: true, title: true },
    });
  }

  async getTourDepartures(query: { status?: string; seats?: string }) {
    const where: any = {};
    if (query.status === 'upcoming') {
      where.departure_date = {
        gte: new Date(),
      };
    }
    if (query.seats === 'available') {
      where.available_seats = {
        gte: 0,
      };
    }

    const departures = await this.prisma.tour_departures.findMany({
      where,
      include: {
        tours: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return departures.map(({ tours, ...rest }) => ({
      ...rest,
      tour: tours,
    }));
  }
}
