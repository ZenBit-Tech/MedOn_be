import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Speciality } from '@entities/Speciality';

@Injectable()
export class SpecialitiesService {
  constructor(
    @InjectRepository(Speciality)
    private specialityRepo: Repository<Speciality>,
  ) {}

  getAllSpecialities(): Promise<Speciality[]> {
    return this.specialityRepo.find();
  }
}