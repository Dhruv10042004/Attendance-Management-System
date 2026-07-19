package com.attendance.config;

import com.attendance.entity.User;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class MongoIndexConfig {

    @Autowired
    private MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initIndexes() {
        IndexOperations indexOps = mongoTemplate.indexOps(User.class);

        Index sapIndex = new Index()
        .on("sap", Sort.Direction.ASC)
        .unique()
        .partial(PartialIndexFilter.of(
                Criteria.where("sap").gt("")));

        indexOps.ensureIndex(sapIndex);
    }
}