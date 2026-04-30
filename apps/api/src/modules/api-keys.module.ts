import { Controller, Get, Module, Param } from '@nestjs/common';

@Controller('api-keys')
class ApiKeysController {
  @Get()
  listApiKeys() {
    return {
      apiKeys: [
        {
          id: 'demo',
          name: 'Local development key',
          prefix: 'ak_live_demo',
          status: 'ACTIVE',
        },
      ],
    };
  }

  @Get(':id')
  getApiKey(@Param('id') id: string) {
    return {
      id,
      name: 'Local development key',
      prefix: 'ak_live_demo',
      status: 'ACTIVE',
    };
  }
}

@Module({
  controllers: [ApiKeysController],
})
export class ApiKeysModule {}
