import { Test, TestingModule } from '@nestjs/testing';
import { TelegrafService } from './telegraf.service';

describe('TelegrafService', () => {
  let service: TelegrafService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegrafService],
    }).compile();

    service = module.get<TelegrafService>(TelegrafService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
